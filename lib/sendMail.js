import nodemailer from "nodemailer";

export const sendMail = async (subject, receiver, body) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.NODEMAILER_HOST,
      port: Number(process.env.NODEMAILER_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Prianka Fashion" <${process.env.NODEMAILER_EMAIL}>`,
      to: receiver,
      subject: subject,
      html: body,
    });

    return { success: true };

  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, message: error.message };
  }
};
