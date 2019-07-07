
var contextInput; 
var clickX = [], clickY = [], clickDrag = [];
var paint;
var arrayN = [];

var questionN = [];
var answerN = []

function startup(){

    // var canvasInput = document.getElementById("canvasInput");
    contextInput = canvasInput.getContext("2d");  
    
    canvasInput.addEventListener("mousedown", function(e){
        paint = true;
        addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
        draw();
    });

    canvasInput.addEventListener("mousemove", function(e){
        if(paint){
            addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
            draw();
        }
    });

    canvasInput.addEventListener("mouseup", function(e){
        paint = false;
        predict();
    });

    canvasInput.addEventListener("mouseleave", function(e){
        paint = false;
    }); 
    
    canvasInput.addEventListener('touchstart', function(e){                
        if (e.touches.length == 1){ 
            var touch = e.touches[0];         
            paint = true;
            addClick(touch.pageX-touch.target.offsetLeft, touch.pageY-touch.target.offsetTop);
            draw();
        }
    });
    
    canvasInput.addEventListener('touchend', function(e){
        paint = false;
        predict();
    });
    
    canvasInput.addEventListener('touchmove', function(e){
        if(paint){
            if (e.touches.length == 1) { 
                var touch = e.touches[0];
                addClick(touch.pageX-touch.target.offsetLeft, touch.pageY-touch.target.offsetTop, true);
                draw();
                event.preventDefault();
            }     
        }
    });
}


function addClick(x, y, dragging){
    clickX.push(x);
    clickY.push(y);
    clickDrag.push(dragging);
}


function draw(){
    contextInput.lineJoin = "round";
    contextInput.lineWidth = 15;
    for(var i=0; i < clickX.length; i++) {      
        contextInput.beginPath();
        if(clickDrag[i] && i){
            contextInput.moveTo(clickX[i-1], clickY[i-1]);
        }
        else{
            contextInput.moveTo(clickX[i]-1, clickY[i]);
        }
        contextInput.lineTo(clickX[i], clickY[i]);
        contextInput.closePath();
        contextInput.stroke();
    }
}


function clearCanvas(){
    contextInput.clearRect(0, 0, contextInput.canvas.width, contextInput.canvas.height);    
    clickX = new Array();
    clickY = new Array();
    clickDrag = new Array(); 
}


function predict(){

    /*****************************
    *** GET INDIVIDUAL DIGITS  *** 
    *****************************/  
         
    // Get ImageData to transform the image to array of pixels
    var imageDataOriginal = contextInput.getImageData(0, 0, contextInput.canvas.width, contextInput.canvas.height);

    // The Image contains 160,000 (400 X 400) pixels.
    // The ImageDataOriginal contains 160,000 * 4 rows.
    // Each 4 rows is one pixel, row 0 is pixel 1 R channel (Red)
    //                           row 1 is pixel 1 G channel (Green)
    //                           row 2 is pixel 1 B channel (Blue)
    //                           row 3 is pixel 1 A channel (Alpha, transparency)        

    // Iterate through the array and get only the Aplha channel, which is 255 for black and 0 for white
    
    var n_width = imageDataOriginal.width;
    var n_height = imageDataOriginal.height;

    
    // Separate different numbers by grouping adjacent pixels            
    var k = 1;  
    arrayN[k] = [];
    for (var row = 0; row<n_height; row++){            
        for (var column = 0; column < n_width; column++){
            if (imageDataOriginal.data[(row*n_width + column)*4+3] > 0){
                
                // Get the adjacent pixels if stroke is continuous and assign it to an array
                var nextColumn = 1;
                arrayN[k].push(row*n_width + column);
                while ( imageDataOriginal.data[(row*n_width + column + nextColumn)*4+3] != 0){
                    arrayN[k].push(row*n_width + column + nextColumn);
                    nextColumn++;
                }                         
               
                // Check if this array is adjacent to another array in a previous row 
                // k is the number or continuous arrays that have been identified
                var arrayAdjusted = [];
                var arrayToMerge = [];
         
                for (var l = 1; l <= k; l++){
                    for (var element = 0; element < arrayN[k].length; element++){
                        arrayAdjusted[element] = arrayN[k][element] - n_width;    
                        if (arrayN[l].includes(arrayAdjusted[element])){
                            arrayToMerge.push(l);
                            arrayToMerge.push(k);    
                            break;
                        }
                    }              
                }
                
                // Remove duplicated from array; decrease count k
                if (arrayToMerge.length > 1) {                            
                    arrayToMerge = Array.from(new Set(arrayToMerge));
                    k--;
                };

                
                // Merge adjacent arrays into the same digit; and clear that array
                for (var f = 1; f < arrayToMerge.length ; f++){
                    arrayN[arrayToMerge[0]] = arrayN[arrayToMerge[0]].concat(arrayN[arrayToMerge[f]]);
                    arrayN[arrayToMerge[f]] = [];
                }

                // Increase count k, initiate arrayNk, move to the correct column
                k++;
                arrayN[k] = [];
                column = column + nextColumn-1;
            }
        }
    };

    
    // Check which arrays are valid digits (length > 0); those that are length 0 are temporary arrays
    var validaArrays = [];
    for (var i = 1;  i < k; i++){
        if (arrayN[i].length > 0){
            validaArrays.push(i);
        }
    }
    
    //// Process Neural Network for each digit
    for (var i = 0; i < validaArrays.length; i++){
        processIndividualImage(arrayN[validaArrays[i]]);
    }
};

       
function processIndividualImage(arrayToProcess){
    
    /*********************
    *** PROCESS IMAGE  *** 
    **********************/   
    
    // Use hidden canvas to put indiviual digit    
    var contextIndImg = canvasIndImage.getContext("2d");
    contextIndImg.clearRect(0, 0, contextIndImg.canvas.width, contextIndImg.canvas.height);

    // Insert array digit into the image data; get columns and rows; put image on canvas
    var imageDataCopy = contextIndImg.getImageData(0,0,contextIndImg.canvas.width,contextIndImg.canvas.height);
    var columnArray = [];
    var rowArray = [];
    for (var j = 0; j < arrayToProcess.length ; j++){        
        imageDataCopy.data[(arrayToProcess[j])*4+3] = 255;                
        columnArray.push(Math.floor(arrayToProcess[j]/400));
        rowArray.push(arrayToProcess[j]%400);
    }         
    contextIndImg.putImageData(imageDataCopy,0,0);
    
    
    // Get the image min and max x and y; Calculate the width and height
    var minX = Math.min.apply(null, rowArray);
    var maxX = Math.max.apply(null, rowArray);
    var minY = Math.min.apply(null, columnArray);
    var maxY = Math.max.apply(null, columnArray);
    var originalWidth = maxX - minX;
    var originalHeight = maxY - minY;


    // To normalize the image and make it similar to the training dataset:
    // Scale the image to a 18 x 18 pixel and center it into a 28 x 28 canvas
    // The largest between the width and height will be scaled to 18 pixel
    // The other will be reduced by the same scale, to preserve original aspect ratio
    var scaleRed;
    if (originalHeight > originalWidth){
        scaleRed = originalHeight/18;
    }
    else {
        scaleRed = originalWidth/18;
    }

    
    // Calculate a new Width and Heitght and new X and Y start positions, to center the image in a 28 x 28 pixel
    var newWidth = originalWidth/scaleRed;
    var newHeight = originalHeight/scaleRed;
    var newXstart = (28 - newWidth)/2;
    var newYstart = (28 - newHeight)/2;
    

    // Draw the scaled and centered image to a new canvas 
    var canvasHidden = document.createElement("canvas");
    canvasHidden.width = 28;
    canvasHidden.height = 28;
    var contextHidden = canvasHidden.getContext("2d");
    contextHidden.clearRect(0, 0, contextHidden.canvas.width, contextHidden.canvas.height);
    contextHidden.drawImage(contextIndImg.canvas, minX, minY, originalWidth, originalHeight, newXstart, newYstart, newWidth, newHeight); 

    
    // Get the Image Data from the new scaled, centered, 28 x 28 pixel image
    // Again, get the Alpha Channel only, but this time also normalize it by dividing it to the maximum value of 255
    var imageData2 = contextHidden.getImageData(0, 0, 28,28);
    processedImage = [];
    for (var i = 0; i<784; i++){
            processedImage[i] = parseFloat((imageData2.data[(i*4)+3]/255).toFixed(10));
    }

    // actual OCR
    answer = nn(processedImage)
    console.log(answer);
    answerN.splice(0, answerN.length);
    answerN[0] = answer;
    answerDiv.innerText = answerN.reduce((x, y) => x.toString()+y.toString());
}   


function newQuestion(max) {
    var max = max || 9
    questionN[0] = Math.ceil(Math.random() * max);
    questionN[1] = Math.ceil(Math.random() * max);
    return questionN;
}

function hitGo() {
    answerDiv.innerText = '';
    questionDiv.innerText = newQuestion().join(' + ') + ' = '
    canvasInput.style.top = questionDiv.style.top;
    canvasInput.style.left = questionDiv.style.left + questionDiv.offsetWidth;
    clearCanvas();
}

function checkAnswer(answer){
    var ans = questionN.reduce((x,y) => x+y);
    var val = parseInt(answerDiv.innerText, 10)
}
