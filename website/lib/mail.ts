import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendContactEmail(data: {
  name: string
  email: string
  phone?: string
  message: string
}) {
  const mailOptions = {
    from: `"Сайт Исправлено.pro" <${process.env.EMAIL_USER}>`,
    to: 'ispravleno.pro@mail.ru',
    subject: `Новое сообщение от ${data.name}`,
    text: `
Имя: ${data.name}
Email: ${data.email}
Телефон: ${data.phone || 'Не указан'}

Сообщение:
${data.message}
`,
    html: `
<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
  <h2 style="color: #1a1a1a; margin-bottom: 20px;">Новая заявка с сайта</h2>
  <p><strong>Имя:</strong> ${data.name}</p>
  <p><strong>Email:</strong> ${data.email}</p>
  <p><strong>Телефон:</strong> ${data.phone || 'Не указан'}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p><strong>Сообщение:</strong></p>
  <p style="white-space: pre-wrap; color: #444;">${data.message}</p>
</div>
`,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Message sent: %s', info.messageId)
    return info
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

