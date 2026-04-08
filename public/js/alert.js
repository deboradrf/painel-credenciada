function toast(message, type = "info") {
  const config = {
    success: {
      background: "#E3F2F4",
      color: "#53A5A6",
      iconColor: "#53A5A6"
    },
    error: {
      background: "#FFE6E6",
      color: "#F05252",
      iconColor: "#F05252"
    },
    warning: {
      background: "#FFF8E6",
      color: "#F1AE33",
      iconColor: "#F1AE33"
    }
  };

  const current = config[type] || config.info;

  Swal.fire({
    toast: true,
    position: "top-end",
    icon: type,
    title: message,
    background: current.background,
    color: current.color,
    iconColor: current.iconColor,
    marginTop: "20px",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: "modern-toast",
      title: "modern-toast-title"
    },
    showClass: { popup: 'swal2-show-toast' },
    hideClass: { popup: 'swal2-hide-toast' },
    didOpen: (popup) => {
      popup.style.boxShadow = "8px 0 15px -3px rgba(0,0,0,0.25), 4px 0 10px -5px rgba(0,0,0,0.12)";
      popup.style.borderRadius = "10px";
      popup.style.backdropFilter = "blur(4px)";
      popup.style.marginTop = "13px";
    }
  });
}

const notify = {
  success: (msg) => toast(msg, "success"),
  error: (msg) => toast(msg, "error"),
  warning: (msg) => toast(msg, "warning"),
};

window.notify = notify;

function modalConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.backdropFilter = "blur(4px)";
    overlay.style.zIndex = 9998;

    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.background = "#FFFFFF";
    modal.style.padding = "30px 40px";
    modal.style.borderRadius = "10px";
    modal.style.boxShadow = "0 8px 25px rgba(0,0,0,0.35)";
    modal.style.zIndex = 9999;
    modal.style.textAlign = "center";
    modal.style.fontFamily = "Poppins, sans-serif";
    modal.style.fontSize = "16px";
    modal.style.color = "#333";
    modal.style.minWidth = "400px";

    const msg = document.createElement("div");
    msg.innerText = message;
    msg.style.marginBottom = "25px";

    const btnConfirm = document.createElement("button");
    btnConfirm.innerHTML = '<i class="fas fa-check"></i> Confirmar';
    btnConfirm.style.backgroundColor = "#53A5A6";
    btnConfirm.style.color = "#FFFFFF";
    btnConfirm.style.marginRight = "10px";
    aplicarEstiloPadrao(btnConfirm);

    const btnCancel = document.createElement("button");
    btnCancel.innerHTML = '<i class="fas fa-xmark"></i> Cancelar';
    btnCancel.style.backgroundColor = "#F1F1F1";
    btnCancel.style.color = "#000000";
    aplicarEstiloPadrao(btnCancel);

    btnConfirm.onclick = () => {
      modal.remove();
      overlay.remove();
      resolve(true);
    };

    btnCancel.onclick = () => {
      modal.remove();
      overlay.remove();
      resolve(false);
    };

    modal.appendChild(msg);
    modal.appendChild(btnConfirm);
    modal.appendChild(btnCancel);
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  });
}

window.confirm = confirm;

function aplicarEstiloPadrao(botao) {
  botao.style.border = "1px solid #E5E7EB";
  botao.style.borderRadius = "10px";
  botao.style.boxShadow = "rgba(213, 217, 217, .5) 0 2px 5px 0";
  botao.style.cursor = "pointer";
  botao.style.fontSize = "14px";
  botao.style.lineHeight = "28px";
  botao.style.padding = "5px 10px";
  botao.style.width = "120px";
  botao.style.transition = "all 0.3s ease";

  botao.onmouseenter = () => {
    botao.style.transform = "translateY(-2px)";
  };

  botao.onmouseleave = () => {
    botao.style.transform = "translateY(0)";
  };
}