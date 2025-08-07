import nodemailer from 'nodemailer';

// Types for email data
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface BillingInfo {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ShippingInfo {
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  country?: string;
  address?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  shippingAddressType?: string;
}

export interface OrderEmailData {
  user: UserInfo;
  payment: any;
  billing: BillingInfo;
  shipping: ShippingInfo; // Added shipping info
  cartItems: any[];
  orderTotal: number;
  orderNumber: string;
  orderDate: string;
  sellingPrice?: string;
  warranty?: string;
  milesPromised?: string;
  make?: string;
  model?: string;
  year?: string;
  part?: string;
  specification?: string;
  merchantMethod?: string;
  approvalCode?: string;
  entity?: string;
  charged?: string;
  saleMadeBy?: string;
  yardName?: string;
  yardMobile?: string;
  yardAddress?: string;
  yardEmail?: string;
  yardPrice?: string;
  yardWarranty?: string;
  yardMiles?: string;
  yardShipping?: string;
  yardCost?: string;
  pictureStatus?: string;
  trackingNumber?: string;
}

// SMTP configuration
const createTransporter = () => {
  return nodemailer.createTransport({
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
const generateAdminEmailHTML = (data: OrderEmailData): string => {
  const { user, payment, billing, shipping, cartItems, orderTotal, orderNumber, orderDate, sellingPrice, warranty, milesPromised, make, model, year, part, specification, merchantMethod, approvalCode, entity, charged, saleMadeBy, yardName, yardMobile, yardAddress, yardEmail, yardPrice, yardWarranty, yardMiles, yardShipping, yardCost, pictureStatus, trackingNumber } = data;

  const cartItemsHTML = cartItems.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">
        <img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />
      </td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.title}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.subtitle}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.make || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.model || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.year || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.part || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.specification || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${item.price}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${(item.price * item.quantity).toFixed(2)}</td>
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
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Make</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Model</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Year</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Part</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Specification</th>
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
            <strong style="font-size: 18px; color: #091B33;">Order Total: ${orderTotal.toFixed(2)}</strong>
          </div>

          <h3 style="margin: 32px 0 8px 0; color: #091B33;">Customer Info</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">Name:</td><td style="padding: 6px; color: #1f2937;">${user.firstName} ${user.lastName}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Email:</td><td style="padding: 6px; color: #1f2937;">${user.email}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Phone:</td><td style="padding: 6px; color: #1f2937;">${billing.phone}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Selling Price:</td><td style="padding: 6px; color: #1f2937;">${sellingPrice || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Warranty:</td><td style="padding: 6px; color: #1f2937;">${warranty || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Miles Promised:</td><td style="padding: 6px; color: #1f2937;">${milesPromised || 'N/A'}</td></tr>
          </table>

          <h3 style="margin: 24px 0 8px 0; color: #091B33;">Billing Address</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">${billing.firstName} ${billing.lastName}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">${billing.address}${billing.apartment ? ', ' + billing.apartment : ''}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">${billing.city}, ${billing.state} ${billing.zipCode}, ${billing.country}</td></tr>
          </table>

          <h3 style="margin: 24px 0 8px 0; color: #091B33;">Shipping Address</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">Type:</td><td style="padding: 6px; color: #1f2937;">${shipping.shippingAddressType || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Name:</td><td style="padding: 6px; color: #1f2937;">${shipping.firstName} ${shipping.lastName}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Phone:</td><td style="padding: 6px; color: #1f2937;">${shipping.phone}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">${shipping.address}${shipping.apartment ? ', ' + shipping.apartment : ''}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">${shipping.city}, ${shipping.state} ${shipping.zipCode}, ${shipping.country}</td></tr>
          </table>

          <h3 style="margin: 24px 0 8px 0; color: #091B33;">Payment Info</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">Method:</td><td style="padding: 6px; color: #1f2937;">${payment.paymentMethod === 'card' ? 'Credit Card' : payment.paymentMethod}</td></tr>
            ${payment.paymentMethod === 'card' && payment.cardData && payment.cardData.cardNumber ? `<tr><td style="padding: 6px; color: #6b7280;">Card Holder:</td><td style="padding: 6px; color: #1f2937;">${payment.cardData.cardholderName || 'N/A'}</td></tr><tr><td style="padding: 6px; color: #6b7280;">Card:</td><td style="padding: 6px; color: #1f2937;">****${payment.cardData.cardNumber.slice(-4)}</td></tr><tr><td style="padding: 6px; color: #6b7280;">Expiry:</td><td style="padding: 6px; color: #1f2937;">${payment.cardData.expirationDate || 'N/A'}</td></tr><tr><td style="padding: 6px; color: #6b7280;">CVV:</td><td style="padding: 6px; color: #1f2937;">***</td></tr>` : ''}
            <tr><td style="padding: 6px; color: #6b7280;">Merchant Method:</td><td style="padding: 6px; color: #1f2937;">${merchantMethod || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Approval Code:</td><td style="padding: 6px; color: #1f2937;">${approvalCode || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Entity:</td><td style="padding: 6px; color: #1f2937;">${entity || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Charged:</td><td style="padding: 6px; color: #1f2937;">${charged || 'N/A'}</td></tr>
          </table>

          <h3 style="margin: 24px 0 8px 0; color: #091B33;">Yard Info</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">Yard Name:</td><td style="padding: 6px; color: #1f2937;">${yardName || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Yard Mobile:</td><td style="padding: 6px; color: #1f2937;">${yardMobile || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Yard Address:</td><td style="padding: 6px; color: #1f2937;">${yardAddress || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Yard Email:</td><td style="padding: 6px; color: #1f2937;">${yardEmail || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Yard Price:</td><td style="padding: 6px; color: #1f2937;">${yardPrice || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Yard Warranty:</td><td style="padding: 6px; color: #1f2937;">${yardWarranty || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Yard Miles:</td><td style="padding: 6px; color: #1f2937;">${yardMiles || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Yard Shipping:</td><td style="padding: 6px; color: #1f2937;">${yardShipping || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Yard Cost:</td><td style="padding: 6px; color: #1f2937;">${yardCost || 'N/A'}</td></tr>
          </table>

          <h3 style="margin: 24px 0 8px 0; color: #091B33;">Additional Info</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr><td style="padding: 6px; color: #6b7280;">Picture Status:</td><td style="padding: 6px; color: #1f2937;">${pictureStatus || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Tracking Number:</td><td style="padding: 6px; color: #1f2937;">${trackingNumber || 'N/A'}</td></tr>
            <tr><td style="padding: 6px; color: #6b7280;">Sale Made By:</td><td style="padding: 6px; color: #1f2937;">${saleMadeBy || 'N/A'}</td></tr>
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
export const sendOrderNotificationEmail = async (data: OrderEmailData): Promise<boolean> => {
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
  } catch (error) {
    console.error('Error sending order notification email:', error);
    return false;
  }
};