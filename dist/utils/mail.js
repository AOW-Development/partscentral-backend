"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderNotificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// SMTP configuration
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });
};
// Generate admin notification email HTML in table format
const generateAdminEmailHTML = (data) => {
    const { user, payment, billing, cartItems, orderTotal, orderNumber, orderDate } = data;
    const cartItemsHTML = cartItems.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">
        <img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />
      </td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.title}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.subtitle}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">$${item.price}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Received - ${orderNumber}</title>
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 700px; margin: 0 auto; background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
        <div style="background: #091B33; color: #fff; padding: 24px 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">PartsCentral.us</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px;">New Order Notification</p>
        </div>
        <div style="padding: 24px;">
          <h2 style="color: #091B33; margin: 0 0 16px 0;">Order #${orderNumber}</h2>
          <p style="color: #6b7280; margin: 0 0 24px 0;">Placed on: ${orderDate}</p>

          <h3 style="margin: 24px 0 8px 0; color: #091B33;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Image</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Title</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Subtitle</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Price</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Qty</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${cartItemsHTML}
            </tbody>
          </table>
          <div style="text-align: right; margin-top: 16px;">
            <strong style="font-size: 18px; color: #091B33;">Order Total: $${orderTotal.toFixed(2)}</strong>
          </div>

          <h3 style="margin: 32px 0 8px 0; color: #091B33;">Customer Info</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">Name:</td><td style="padding: 6px; color: #1f2937;">${user.firstName} ${user.lastName}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Email:</td><td style="padding: 6px; color: #1f2937;">${user.email}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Phone:</td><td style="padding: 6px; color: #1f2937;">${billing.phone}</td></tr>
          </table>

          <h3 style="margin: 24px 0 8px 0; color: #091B33;">Billing Address</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">${billing.firstName} ${billing.lastName}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">${billing.address}${billing.apartment ? ', ' + billing.apartment : ''}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">${billing.city}, ${billing.state} ${billing.zipCode}, ${billing.country}</td></tr>
          </table>

          <h3 style="margin: 24px 0 8px 0; color: #091B33;">Payment Info</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">Method:</td><td style="padding: 6px; color: #1f2937;">${payment.paymentMethod === 'card' ? 'Credit Card' : 'PayPal'}</td></tr>
            ${payment.paymentMethod === 'card' && payment.cardData && payment.cardData.cardNumber ? `<tr><td style="padding: 6px; color: #6b7280;">Card:</td><td style="padding: 6px; color: #1f2937;">****${payment.cardData.cardNumber}</td></tr>` : ''}
          </table>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin: 0 0 8px 0;">Questions or need support?</p>
            <p style="color: #6b7280; margin: 0;">Contact: <a href="mailto:support@partscentral.us" style="color: #091B33;">support@partscentral.us</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
// Send order notification email to admin
const sendOrderNotificationEmail = async (data) => {
    try {
        const transporter = createTransporter();
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@autosquare.us';
        const mailOptions = {
            from: `"PartsCentral.us Orders" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `New Order Received - ${data.orderNumber}`,
            html: generateAdminEmailHTML(data),
        };
        const result = await transporter.sendMail(mailOptions);
        console.log('Order notification email sent to admin:', result.messageId);
        return true;
    }
    catch (error) {
        console.error('Error sending order notification email:', error);
        return false;
    }
};
exports.sendOrderNotificationEmail = sendOrderNotificationEmail;
