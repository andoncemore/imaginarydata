from flask import Flask, render_template, request, redirect
import base64
import csv
from escpos.printer import Usb
from PIL import Image, ImageEnhance, ImageDraw
import io

printer = Usb(0x04b8,0x0202)
app = Flask(__name__)


@app.route("/")
def home():
    return "Hello, World!"

@app.route('/collection')
def collection():
    return render_template('index.html')

@app.route('/landscape')
def landscape():
    return render_template('landscape.html')

@app.route('/upload-data', methods=["POST", "GET"])
def upload_data():
    if request.method == "POST":
        data = request.get_json()
        print(data)
        decoded_data = base64.b64decode(data['image'].split(',')[1])
        recieptPrint(decoded_data,data['labels'])
        # saveToDisk(decoded_data,data['labels'],'testimage')
        print(data['labels'])
        return redirect(request.url)
    elif request.method == "GET":
        return "You're GETting the POST"

@app.route('/print-strip',methods=["POST", "GET"])
def print_strip():
    if request.method == "POST":
        data = request.get_json()
        decoded_data = base64.b64decode(data['image'].split(',')[1])
        recieptPrint(decoded_data,data['labels'])
        # saveToDisk(decoded_data,data['labels'],'testimage')
        print(data['labels'])
        return redirect(request.url)
    elif request.method == "GET":
        return "You're GETting the POST"

printing = False
printBuffer = []
# Image comes in as a Byte Array
# Labels is an array of dictionaries, with positions and labels
def recieptPrint(image,labels):
    im = Image.open(io.BytesIO(image))
    draw = ImageDraw.Draw(im)
    width,height = im.size
    for box in labels:
        points = [box['x']*width,box['y']*height,(box['x']+box['w'])*width,(box['y']+box['h'])*height]
        draw.rectangle(points,fill=(255, 255, 255), outline=(0,0,0),width=2)
        print(points)

    im = im.rotate(270,expand=True)
    im = im.resize((500,250),Image.ANTIALIAS)

    ### Adjust Contrast
    #enhancer = ImageEnhance.Contrast(im)
    #im = enhancer.enhance(0.75)
    printer.image(im,high_density_vertical=False)
    print("Done printing")

def saveToDisk(image,labels,filename):
    with open(filename+'.jpeg', 'wb') as file_to_save:
        file_to_save.write(image)
    # with open("data.csv", "wt") as csvfile:
    #     writer = csv.writer(csv,delimeter=",")
    #     for entry in


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')
