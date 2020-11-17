// Code adapted from Rodrigo Figueroa: https://shadowbeat274.medium.com/how-to-use-pdf-js-and-how-to-create-a-simple-pdf-viewer-for-your-web-in-javascript-5cff608a3a10

let loadPDF =   pdfjsLib.getDocument("./images/12f-chopped.pdf"),
                pdfDoc = null,
                canvasOdd = document.getElementById('odd_pages'),
                canvasEven = document.getElementById('even_pages'),
                ctxOdd = canvasOdd.getContext('2d'),
                ctxEven = canvasEven.getContext('2d'),
                scale = 1.5,
                numOddPage = 1
                numEvenPage = 2;

loadPDF.promise.then(pdf => {
    pdfDoc = pdf;
    displayOddPage(numOddPage)
    displayEvenPage(numEvenPage)
});

function displayOddPage(numPage) {
    pdfDoc.getPage(numPage).then(page => {
        let viewport = page.getViewport({ scale: scale });
        
        canvasOdd.height = viewport.height;
        canvasOdd.width = viewport.width;
        
        let renderContext = {
            canvasContext : ctxOdd,
            viewport:  viewport
        }

        page.render(renderContext);
        })
}

function displayEvenPage(numPage) {
    pdfDoc.getPage(numPage).then(page => {
        let viewport = page.getViewport({ scale: scale });
        
        canvasEven.height = viewport.height;
        canvasEven.width = viewport.width;
        
        let renderContext = {
            canvasContext : ctxEven,
            viewport:  viewport
        }

        page.render(renderContext);
        })
}

function prevOddPage() {
    if(numOddPage === 1){
        return
    }
    numOddPage -= 2;
    displayOddPage(numOddPage);
}

function nextOddPage() {
    if(numOddPage + 1 >= pdfDoc.numPages){
        return
    }
    numOddPage += 2;
    displayOddPage(numOddPage);
}

document.getElementById('prevOdd').addEventListener('click', prevOddPage)
document.getElementById('nextOdd').addEventListener('click', nextOddPage)

function prevEvenPage() {
    if(numEvenPage === 1){
        return
    }
    numEvenPage -= 2;
    displayEvenPage(numEvenPage);
}

function nextEvenPage() {
    if(numEvenPage + 1 >= pdfDoc.numPages){
        return
    }
    numEvenPage += 2;
    displayEvenPage(numEvenPage);
}

document.getElementById('prevEven').addEventListener('click', prevEvenPage)
document.getElementById('nextEven').addEventListener('click', nextEvenPage)