import PDFDocument from 'pdfkit';

function buildPDF(data,dataCallBack,endCallBack){
    const doc = new PDFDocument();
    doc.on('data',dataCallBack);
    doc.on('end',endCallBack);
    doc.fontSize(20).text(data);
    doc.end();
}   

export {buildPDF};