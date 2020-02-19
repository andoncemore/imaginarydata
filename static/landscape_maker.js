let sv;
let panorama;

function initialize(){
    let panoLoc = {pitch:34,heading:10,lat:42.345573,lng:-71.098326};
    var map = new google.maps.Map(document.getElementById('map'),{
        center: {lat: panoLoc.lat, lng: panoLoc.lng},
        zoom: 14
    });
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById('pano'),{
        position: {lat: panoLoc.lat, lng: panoLoc.lng},
        addressControl: false,
        disableDefaultUI: true,
        zoom: 1,
        scrollwheel: false,
        pov: {
            heading: panoLoc.heading,
            pitch: panoLoc.pitch
        }
    });
    map.setStreetView(panorama);
    sv = new google.maps.StreetViewService();
}
async function getStreetView(location){
    let url= `https://maps.googleapis.com/maps/api/streetview?location=${location.lat},${location.lng}&size=640x640&source=outdoor&fov=75&heading=${location.heading}&pitch=${location.pitch}&key=AIzaSyDz-wPsGB_lG2dyNjUmHnR97jzA4QCZeF4`;
    let response = await fetch(url);
    let blob_response = await response.blob();
    let im = URL.createObjectURL(blob_response);
    return im;
}

let evaluate;
let backstage;
let yolo;
let classifier;
function setup(){
    yolo = ml5.YOLO({
        filterBoxesThreshold: 0.01,
        IOUThreshold: 0.4,
        classProbThreshold:0.4,
    }, modelLoaded)
    // classifier = ml5.imageClassifier('MobileNet',modelLoaded);
    backstage = createGraphics(640,640);
    evaluate = select("#b1");
}


function makeLandscape(size){
    let startPov = panorama.getPov();
    let startPosition = panorama.getPosition()
    let currentPosition = {
        pitch: startPov.pitch,
        heading: startPov.heading,
        lng: startPosition.lng(),
        lat: startPosition.lat(),
        panoID: panorama.getPano()
    }
    sv.getPanorama({pano:currentPosition.panoID},getPanoInfo);
    let imageCount = 0;

    function getPanoInfo(data,status){
        currentPosition.lat = data['location'].latLng.lat();
        currentPosition.lng = data['location'].latLng.lng();
        getStreetView(currentPosition).then(imURL =>{
            // What should we do with the image?
            loadImage(imURL, img => {
                URL.revokeObjectURL(imURL);
                img.loadPixels();
                backstage.image(img,0,0);
                let data = {};
                data['image'] = img.canvas.toDataURL('image/jpeg');

                //If Doing ML on Client Side
                yolo.detect(img.imageData).then(res => {
                    console.log(res);
                    data['labels'] = res;
                    uploadData('/print-strip',data).then(response =>{
                        console.log(response);
                    });
                });
                //Else if Doing ML on Server Side
                // uploadData('/evaluate',data).then(response =>{
                //     console.log(response);
                // });

            });
            // Setup to Find the Next Image
            let nextPano = nextLocation(data['links']);
            currentPosition.heading = nextPano.heading - 90;
            currentPosition.panoID = nextPano.pano;
            imageCount += 1;
            if(imageCount < size){
                sv.getPanorama({pano:currentPosition.panoID},getPanoInfo);
            }
        });

    }
}

//Helper Function to Send Image
async function uploadData(url,data){
    let response = await fetch(url,{
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data)
    });
    return response;
}


function modelLoaded(){
    evaluate.mousePressed(() =>{
        makeLandscape(10);
    });
}

// Helper Function to sort link list to find appropriate direction
function nextLocation(links){
    let goal = (panorama.getPov().heading+90)%360;
    let sorted = links.sort(function(a,b){
        return min(Math.abs(a.heading-goal),360-Math.abs(a.heading-goal)) - min(Math.abs(b.heading-goal),360-Math.abs(b.heading-goal));
    });
    return links[0];
}
