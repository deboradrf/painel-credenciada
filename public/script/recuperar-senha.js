document.getElementById("recuperarForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value
    const usuario = document.getElementById("usuario").value
    const botao = document.getElementById("btnRecuperar")

    botao.disabled = true
    botao.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        Enviando...
    `

    try {
        const res = await fetch("/recuperar-senha", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, usuario })
        })

        const data = await res.json()

        if (!res.ok) {
            botao.disabled = false
            botao.innerText = "Recuperar senha"

            alert(data.erro)
            return
        }

        alert(data.message)
        window.location.href = "/pages/login.html"

    } catch (err) {
        console.error(err)
        botao.disabled = false
        botao.innerText = "Recuperar senha"

        alert("Erro ao recuperar senha")
    }
})

// MÁSCARA DE CPF
const usuarioInput = document.getElementById("usuario");

usuarioInput.addEventListener("input", function () {
    let value = this.value.replace(/\D/g, "");

    value = value.replace(/^(\d{3})(\d)/, "$1.$2");
    value = value.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    value = value.replace(/\.(\d{3})(\d)/, ".$1-$2");

    this.value = value;
});