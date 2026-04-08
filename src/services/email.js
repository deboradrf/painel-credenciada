const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

// FUNÇÃO PARA ENVIO DE E-MAIL DE RECUPERAÇÃO DE SENHA
async function enviarEmailRecuperacao(email, novaSenha) {
  await transporter.sendMail({
    from: "Portal Salubritá <naoresponda@salubrita.com.br>",
    to: email,
    subject: "Recuperação de senha",
    text: `
      Sua senha foi redefinida.

      Nova senha: ${novaSenha}

      Recomendamos que você altere sua senha após acessar o sistema.

      Caso você não tenha solicitado, ignore este email.
    `
  });
}

module.exports = { enviarEmailRecuperacao };