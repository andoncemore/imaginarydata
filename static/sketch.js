// ----------------- DATA STUFFS ----------------

let panoLoc = {pitch:34,heading:10,lat:42.345573,lng:-71.098326,panoID:0};
let latestImage = {p5im:"",im:"",latest:false}
function initialize(){
    var panorama = new google.maps.StreetViewPanorama(
        document.getElementById('pano'),{
            position: {lat: panoLoc.lat, lng: panoLoc.lng},
            disableDefaultUI: true,
            pov: {
                heading: panoLoc.heading,
                pitch: panoLoc.pitch
            }
        }
    );
    panorama.addListener('position_changed',function(){
        let currentPosition = panorama.getPosition();
        panoLoc.lat = currentPosition.lat();
        panoLoc.lng = currentPosition.lng();
        latestImage.latest = false;
    });
    panorama.addListener('pov_changed',function(){
        let currentPOV = panorama.getPov();
        panoLoc.pitch = currentPOV.pitch;
        panoLoc.heading = currentPOV.heading;
        latestImage.latest = false;
    });
    panorama.addListener('pano_changed',function(){
        panoLoc.panoID = panorama.getPano();
        latestImage.latest = false;
    });
    // latestImage.im = getStreetViewImage(panoLoc);
}

async function getStreetViewImage(location){
    console.log("Calling Google Street View API");
    let url= `https://maps.googleapis.com/maps/api/streetview?location=${location.lat},${location.lng}&size=640x640&heading=${location.heading}&pitch=${location.pitch}&key=AIzaSyDz-wPsGB_lG2dyNjUmHnR97jzA4QCZeF4`;
    let response = await fetch(url);
    let blob_response = await response.blob();
    let im = URL.createObjectURL(blob_response);
    return im;
}

// ---------- UI MANAGEMENT ---------------

let drawModeButton;
let navModeButton;
let submitButton;


//Helper Functions For Mode Switching
function switchDraw(){
    if(drawMode == false){
        drawMode = true;
        submitButton.show();
        drawModeButton.style('opacity','1');
        navModeButton.style('opacity','0.4');
        select("#pano").addClass('draw');
        if(latestImage.latest == false){
            URL.revokeObjectURL(latestImage.im);
            getStreetViewImage(panoLoc).then(res =>{
                latestImage.im = res;
                loadImage(res, img =>{
                    latestImage.p5im = img;
                    latestImage.latest = true;
                    backstage.image(img,0,0);
                    showPrompt();
                });
            });
        }
        else{
            showPrompt();
        }
        for(let i=0; i<dataLabels.length;i++){
            dataLabels[i].showDOM();
        }
    }
}

function switchNav(){
    if(drawMode == true){
        drawMode = false;
        submitButton.hide();
        drawModeButton.style('opacity','0.4');
        navModeButton.style('opacity','1');
        select("#pano").removeClass('draw');
    }

    // for(let i=0; i<dataLabels.length;i++){
    //     dataLabels[i].hideDOM();
    // }
}

function initializeDraw(){
    for(let i=0; i<dataLabels.length;i++){
        dataLabels[i].deleteSelf();
    }
    dataLabels = [];
    dataLabels.push(new LabelBox(drawCanvas.width/2-85,drawCanvas.height/2-25,drawCanvas.width,drawCanvas.height,labelChanged));
    dataLabels[0].showDOM();
    dataLabels[0].active = true;
    active_label = 0;
}

function addData(){
    // <div><div class="imgbox"><img src="images/example-data.jpeg"><div></div></div><p>Label</p></div>
    var formattedLabels = "";
    var displayData = "";
    let serverData = [];
    for(let label of dataLabels){
        let label_text = label.inp.value();
        if(label_text.trim() != ""){
            let pos = label.getPosition();
            pos.y = pos.y/drawCanvas.height;
            pos.x = pos.x/drawCanvas.width;
            pos.w = pos.w/drawCanvas.width;
            pos.h = pos.h/drawCanvas.height;
            pos.l = label_text.trim();
            formattedLabels += label_text.trim() + ", ";
            displayData += `<div style=\"top:${pos.y*100}%; left:${pos.x*100}%; width:${pos.w*100}%; height:${pos.h*100}%;\"></div>`;
            serverData.push(pos);
        }
    }
    if(formattedLabels != "" && displayData != ""){
        createDiv(`<div class=\"imgbox\"><img src=\"${latestImage.im}\">${displayData}</div><p>${formattedLabels.substring(0,formattedLabels.length-2)}</p>`).parent(select('.datagrid'));
        uploadData(latestImage.p5im,serverData);
        console.log("Called Upload Data");
    }
    initializeDraw();

}

async function uploadData(im,positions){
    let subimage = latestImage.p5im;
    subimage.loadPixels();
    let data = {};
    data['image'] = subimage.canvas.toDataURL('image/jpeg');
    data['labels'] = positions;
    const response = await fetch('/upload-data', {
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

let drawMode = false;
let drawCanvas;
let backstage;
let dataLabels = [];
let active_label;

function setup(){
    let cnvParent = select('#pano')
    drawCanvas = createCanvas(cnvParent.elt.clientWidth,cnvParent.elt.clientHeight).parent(cnvParent);
    drawCanvas.elt.oncontextmenu = function(e){
        e.preventDefault();
    }
    drawCanvas.touchStarted(canvasTouched);
    backstage = createGraphics(640,640);
    drawModeButton = select("#draw-mode");
    drawModeButton.elt.onclick = switchDraw;
    navModeButton = select("#nav-mode");
    navModeButton.elt.onclick = switchNav;
    navModeButton.style('opacity','1');
    submitButton = select("#submit");
    submitButton.hide();
    submitButton.elt.onclick = addData;
    switchNav();
    initializeDraw();
    createOptions();
}

function draw(){
    clear();
    for(let i=0; i<dataLabels.length;i++){
        dataLabels[i].show(drawCanvas.width,drawCanvas.height,drawMode);
    }
}


//Global Mouse Pressed Function
function mousePressed(){
    if(drawMode){
        if(mouseX > 5 && mouseY > 5 && mouseX < drawCanvas.width-5 && mouseY < drawCanvas.height-5){
            if(mouseButton === LEFT){
                for(let i=0; i<dataLabels.length;i++){
                    if(dataLabels[i].clicked(mouseX,mouseY)){
                        if(i != active_label){
                            active_label = i;
                        }

                    }
                }
                for(let i=0;i<dataLabels.length;i++){
                    if(i != active_label){
                        dataLabels[i].deactivate();
                    }
                }
            }
            else if(mouseButton === RIGHT){
                dataLabels.push(new LabelBox(mouseX,mouseY,drawCanvas.width,drawCanvas.height,labelChanged));
                dataLabels[dataLabels.length-1].showDOM();
            }

        }
    }
}


function canvasTouched(event) {
  console.log(event);
}

//Global Mouse Dragged Listener
function mouseDragged(){
    if(drawMode){
        if(mouseX > 5 && mouseY > 5 && mouseX < drawCanvas.width-5 && mouseY < drawCanvas.height-5){
            for(let i=0; i<dataLabels.length;i++){
                dataLabels[i].dragged(mouseX,mouseY,drawCanvas.width,drawCanvas.height);
            }
        }
    }

}
//Global Mouse Release Listener
function mouseReleased(){
    if(drawMode){
        for(let i=0; i<dataLabels.length;i++){
            if(dataLabels[i].released()){
                showPrompt();
            }
        }
    }
}

//Mode Set Functions
function keyPressed(){
    //Toggle Edit Mode
    if(keyCode === 18){
        (drawMode ? switchNav() : switchDraw());

    }
    //If in Edit Mode, Submit Data
    if(drawMode && keyCode === ENTER){
        addData();
    }

    if(drawMode && keyCode === DELETE){
        if(dataLabels.length > 1){
            dataLabels[active_label].deleteSelf();
            dataLabels.splice(active_label,1);
            active_label = dataLabels.length-1;
            dataLabels[active_label].active = true;
        }
    }
}

function labelChanged(word){
    if(word.target.value.charAt(word.target.value.length-1) == ' '){
        if(sel.elt.value == "attnGAN"){
            attnGAN(word.target.value)
        }
        else if(sel.elt.value == "distilGPT2"){
            distilGPT2(word.target.value);
        }
    }
}


//-------------- Classes --------------

class LabelBox {

    //Initialize
    constructor(xpos,ypos,w,h,label_callback){
        this.p1 = new DragPoint(xpos,(ypos+50 < h-5 ? ypos+50 : h-5));
        this.p2 = new DragPoint((xpos+170 < w-5 ? xpos+170 : w-5),ypos);
        this.r = 10;
        this.width = abs(this.p1.x-this.p2.x);
        this.height=abs(this.p1.y-this.p2.y);
        this.drag = false;
        this.label = "";
        this.p1Off = [0,0];
        this.p2Off = [0,0];
        this.inp = createInput().addClass("category").parent(select("#pano"));
        this.inp.attribute("placeholder","what do you imagine here?");
        this.inp.style('display','none');
        this.inp.input(label_callback);
        this.active = false;
    }

    //Called in the Draw Function
    show(canvasWidth,canvasHeight,mode){

        if(this.active && mode==true){
            this.p1.show('rgb(0,0,255)');
            this.p2.show('rgb(0,0,255)');
            strokeWeight(3);
            stroke('rgb(0,0,255)');
        }
        else{
            this.p1.show('rgb(0,255,0)');
            this.p2.show('rgb(0,255,0)');
            strokeWeight(3);
            stroke('rgb(0,255,0)');
        }

        noFill();
        rect(min(this.p1.x,this.p2.x),min(this.p1.y,this.p2.y),this.width,this.height);
        this.inp.style("left",(min(this.p1.x,this.p2.x)-2)/canvasWidth*100+"%");
        this.inp.style("top",(min(this.p1.y,this.p2.y)-25)/canvasHeight*100+"%");
        this.inp.style("width",(this.width-15)/canvasWidth*100+"%");

    }

    showDOM(){
        this.inp.style("display","block");
    }

    hideDOM(){
        this.inp.style('display','none');
    }

    deleteSelf(){
        this.inp.remove();
    }

    deactivate(){
        this.active = false;
    }

    getPosition(){
        return {x:min(this.p1.x,this.p2.x),y:min(this.p1.y,this.p2.y),w:this.width,h:this.height}
    }

    //What to do on Click
    clicked(mx,my){
        let p1_click_result = this.p1.clicked(mx,my);
        let p2_click_result = this.p2.clicked(mx,my);
        if(!p1_click_result && !p2_click_result && mx > min(this.p1.x,this.p2.x) && mx < min(this.p1.x,this.p2.x)+this.width && my > min(this.p1.y,this.p2.y) && my < min(this.p1.y,this.p2.y)+this.height){
            this.drag = true;
            this.p1Off = [mx-this.p1.x,my-this.p1.y];
            this.p2Off = [mx - this.p2.x,my-this.p2.y];
            this.active = true;
            return true;
        }
        else if(p1_click_result || p2_click_result){
            this.active = true;
            return true;
        }
        else{
            return false;
        }
    }

    //Drag Around The Thing
    dragged(mx,my,w,h){
        if(this.p1.dragged(mx,my) || this.p2.dragged(mx,my)){
            //update rectangle size
            this.width = abs(this.p1.x-this.p2.x);
            this.height = abs(this.p1.y-this.p2.y);
        }
        else if(this.drag){
            let np1 = [mx-this.p1Off[0],my-this.p1Off[1]];
            let np2 = [mx-this.p2Off[0],my-this.p2Off[1]]
            if(this.onScreen(np1[0],np1[1],w,h) && this.onScreen(np2[0],np2[1],w,h)){
                this.p1.move(np1[0],np1[1]);
                this.p2.move(np2[0],np2[1]);
            }
            else{
                this.p1Off = [mx-this.p1.x,my-this.p1.y];
                this.p2Off = [mx - this.p2.x,my-this.p2.y];
            }
        }
    }

    //Helper Function to Check if New Position is On Screen
    onScreen(xpos,ypos,w,h){
        if(xpos > 5 && xpos < w-5 && ypos > 5 && ypos < h-5){
            return true;
        }
        else{
            return false;
        }
    }

    //Release Rectangle and Points
    released(){
        if(this.p1.released() || this.p2.released() || this.drag == true){
            this.drag = false;
            this.p1Off = [0,0];
            this.p2Off = [0,0];
            return true;
        }
        else{
            return false;
        }

    }
}

class DragPoint {
    constructor(xpos,ypos){
        this.x = xpos;
        this.y = ypos;
        this.drag = false;
        this.xOff = 0;
        this.yOff = 0;
        this.r = 10;
    }
    //Draw Point
    show(color){
        noStroke();
        fill(color);
        circle(this.x,this.y,this.r);
    }
    move(xpos,ypos){
        this.x = xpos;
        this.y = ypos;
    }

    clicked(mx,my){
        if(dist(mx,my,this.x,this.y)<this.r){
            this.drag = true;
            this.xOff = mx - this.x;
            this.yOff = my - this.y;
            return true;
        }
        else{
            return false;
        }
    }
    dragged(mx,my){
        if(this.drag){
            this.x = mx-this.xOff;
            this.y = my-this.yOff;
            return true;
        }
        else{
            return false;
        }
    }
    released(){
        if(this.drag == true){
            this.drag = false;
            this.xOff = 0;
            this.yOff = 0;
            return true;
        }
        else{
            return false;
        }

    }
}

// -------------- Imagination Prompts -------------
// To add a new prompt:
// (1) Add a new selection option
// (2) Create a function to calculate the prompt
// (3) Connect the selection with the showPrompt

let sel;
let machine_results;
let loading;
function createOptions(){
    sel=createSelect(select("#ideas"));
    sel.option('im2txt');
    sel.option('deep dream');
    sel.option("BiBiGAN");
    sel.option('attnGAN');
    sel.option('distilGPT2');
    sel.option('places365');
    sel.changed(selectEvent);

    machine_results = select(".machine_results");
    machine_results.html('');
    loading = select(".loading");
    loading.addClass('hidden');

}
function selectEvent(){
    if(drawMode){
        machine_results.html('');
        showPrompt();
    }

}
function showPrompt(){
    switch(sel.value()){
        case "im2txt":
            im2txt();
            break;
        case "deep dream":
            deepDream();
            break;
        case "BiBiGAN":
            biBiGAN();
            break;
        case 'places365':
            places365();
            break;
    }
}

function imageSectionURL(){
    let cbox = dataLabels[active_label].getPosition();
    let subimage = latestImage.p5im.get(cbox.x/drawCanvas.width*640,cbox.y/drawCanvas.height*640,cbox.w/drawCanvas.width*640,cbox.h/drawCanvas.height*640);
    subimage.loadPixels();
    backstage.image(subimage,0,0);
    backstage.clear();
    return subimage.canvas.toDataURL('image/jpeg');
}

async function deepDream(){

    // loading.removeClass('hidden');
    // let urlx = imageSectionURL();
    // const inputs = {
    //     "image": urlx,
    //     "num_octaves": 3,
    //     "iterations": 20,
    //     "octave_scale": 1.4,
    //     "features_mixed_2": 0.52,
    //     "features_mixed_3": 0.5,
    //     "features_mixed_4":2,
    //     "features_mixed_5": 1.5
    // };
    // let response = await fetch('http://localhost:8001/query',{
    //     method: 'POST',
    //     headers: {
    //         Accept: 'application/json',
    //         'Content-Type':'application/json',
    //     },
    //     body: JSON.stringify(inputs)
    // });
    // let res_json = await response.json();
    //
    // URL.revokeObjectURL(urlx);
    machine_results.html('');
    // console.log(res_json);
    createImg('static/images/deep_dream.jpeg').parent(machine_results)
    // createP(res_json.caption).parent(machine_results);
    // loading.addClass('hidden');
}

async function im2txt(){
    //Prepare Input Data
    loading.removeClass('hidden');
    let urlx = imageSectionURL();
    const inputs = {
        "image": urlx
    };

    //Send out Request
    let response = await fetch('http://localhost:8002/query',{
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type':'application/json',
        },
        body: JSON.stringify(inputs)
    });
    let res_json = await response.json();

    //Display Results
    URL.revokeObjectURL(urlx);
    machine_results.html('');
    createP(res_json.caption).parent(machine_results);
    loading.addClass('hidden');
}

async function biBiGAN(){
    loading.removeClass('hidden');
    let urlx = imageSectionURL();
    const inputs = {
        "input_image": urlx
    };

    //Send out Request
    let response = await fetch('http://localhost:8000/query',{
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type':'application/json',
        },
        body: JSON.stringify(inputs)
    });
    let res_json = await response.json();

    //Display Results
    URL.revokeObjectURL(urlx);
    machine_results.html('');
    createImg(res_json.output_image).parent(machine_results);
    // createP(res_json.caption).parent(machine_results);
    loading.addClass('hidden');
}

async function attnGAN(word){
    console.log("rungan")
    loading.removeClass('hidden');
    const inputs = {
        "caption": word
    };

    //Send out Request
    let response = await fetch('http://localhost:8001/query',{
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type':'application/json',
        },
        body: JSON.stringify(inputs)
    });
    let res_json = await response.json();

    //Display Results
    machine_results.html('');
    createImg(res_json.result).parent(machine_results);
    loading.addClass('hidden');
}

async function distilGPT2(word){
    // loading.removeClass('hidden');
    console.log("run gpt2, " + word);
    const inputs = {
        "prompt": word
    }
    //Send out Request
    let response = await fetch('http://localhost:8000/query',{
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type':'application/json',
        },
        body: JSON.stringify(inputs)
    });
    let res_json = await response.json();
    machine_results.html('');
    createP(res_json.generated).parent(machine_results);
    loading.addClass('hidden');

}

async function places365(){
    //Prepare Input Data
    console.log('placed365')
    loading.removeClass('hidden');
    let urlx = imageSectionURL();
    const inputs = {
        "photo": urlx
    };

    //Send out Request
    let response = await fetch('http://localhost:8000/query',{
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type':'application/json',
        },
        body: JSON.stringify(inputs)
    });
    let res_json = await response.json();

    //Display Results
    URL.revokeObjectURL(urlx);
    machine_results.html('');
    createP(res_json.label).parent(machine_results);
    loading.addClass('hidden');
}
