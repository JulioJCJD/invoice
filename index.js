const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { x } = require('joi');
const logo = 'logo.png';
const cors = require('cors'); 
require('dotenv').config();
const ngrok = require("@ngrok/ngrok");

const app = express();
//Numero a cambiar
const numeroNGAW = process.env.NUMERO_NGAW || '18296201596';

const customErrors = {
    notFound: { message: 'El servidor no se encuentra actualmente disponible, intente de nuevo en un rango de 5min - 10min' },
    unauthorized: { message: 'Unauthorized access', statusCode: 401 },
};


app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.send('Home Page Route'));
app.get('/about', (req, res) => res.send('About Page Route'));

app.post('/send-message-NGAW', async (req, res) => {
    const { tutorname, clientname, cellphoneNumber, fdate, fservicio } = req.body;

    const optionalNumber = req.body.whatsappNumber || numeroNGAW;
    const customErrorMessage = "El servidor no se encuentra actualmente disponible. Por favor, inténtalo de nuevo más tarde.";
        
    try {
        await createInvoiceNGAW(tutorname, clientname, cellphoneNumber, 
            fdate, fservicio, optionalNumber).then(() => res.sendStatus(200)).catch
            (error => res.status(418).send(customErrorMessage));
        console.log("Reservacion a nombre de: " + tutorname + " para la cita de: " + clientname 
        + " a la fecha: " + fdate);    
    } catch (error) {
        res.status(418).send(customErrorMessage);
    }
})
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Server listening on port: ${port}');
})

const client = new Client({
    // authStrategy: new LocalAuth()
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.initialize();

function sendMessageWithInvoice(number, invoice, pdfName, fileSizeInBytes, clientname, tutorname, fdate) {
    return new Promise((resolve, reject) => {
        var clientNumber = number + "@c.us";
        var invoiceMedia = new MessageMedia("application/pdf", invoice, pdfName, fileSizeInBytes);
        client.sendMessage(clientNumber, invoiceMedia, {caption: "Reservacion a nombre de: " + tutorname + 
        " para la cita de: " + clientname + " a la fecha: " + fdate}).then(() => {
            resolve(); // Resolve the promise when the message is sent
        }).catch(error => {
            reject(new Error("Ocurrio un problema intentando enviar el archivo")); // Reject the promise if an error occurs
        });
    });
}

function createInvoiceNGAW(tutorname, clientname, cellphoneNumber, fdate, fservicio, optionalNumber) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument;
    
        doc.font("fonts/Poppins-Regular.ttf");
        
        doc.image(logo, { width: 100, height: 100, align: 'center' , x: 250 , y: 10});
        
        doc.fontSize(20);
        
        doc.text("Nisanni Gonzalez", 230, 120, { fontSize: 25 });
        
        doc.text("* Nombre del tutor: " + tutorname, 180, 180);
        doc.text("* Nombre del paciente: " + clientname , 180);
        doc.text("* Numero de telefono: " + cellphoneNumber , 180);
        doc.text("* Tipo de servicio solicitado: " + fservicio , 160);
        doc.text("* Fecha de consulta: " + formatCustomDate12hr(fdate) , 180);
        
        try {
            var buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async function () {
                var pdfData = Buffer.concat(buffers);
                var fileSizeInBytes = pdfData.length; // Obtain the file size
                var pdfDataBase64 = pdfData.toString('base64');
                await sendMessageWithInvoice(optionalNumber, pdfDataBase64, tutorname  + " - " + formatCustomDate12hr(fdate), fileSizeInBytes, clientname, tutorname, formatCustomDate12hr(fdate));
                resolve(); // Resolve the promise when the message is sent
            });
        
        } catch (error) {
            reject(new Error('Failed to create invoice')); // Reject the promise if an error occurs
        }
        doc.end();
    });
}

function formatCustomDate12hr(dateString) {
    var date = new Date(dateString);
  
    var day = date.getDate().toString().padStart(2, '0'); // Get the day and pad with leading zero if necessary
    var month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get the month (zero-based) and pad with leading zero if necessary
    var year = date.getFullYear();
  
    var hours = date.getHours() % 12 || 12; // Get the hours in 12-hour format
    var minutes = date.getMinutes().toString().padStart(2, '0'); // Get the minutes and pad with leading zero if necessary
    var period = date.getHours() >= 12 ? 'PM' : 'AM'; // Determine the AM or PM designation
  
    return `${day}-${month}-${year} - ${hours}:${minutes} ${period}`;
}
