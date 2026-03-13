document.getElementById("recuperarForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value
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
            body: JSON.stringify({ email })
        })

        const data = await res.json()

        alert(data.message)

        window.location.href = "/pages/login.html"

    } catch (err) {
        console.error(err)
        alert("Erro ao recuperar senha")

        botao.disabled = false
        botao.innerText = "Recuperar senha"
    }
})