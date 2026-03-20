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
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: "custom-toast"
    },
  });
}

const notify = {
  success: (msg) => toast(msg, "success"),
  error: (msg) => toast(msg, "error"),
  warning: (msg) => toast(msg, "warning"),
};

window.notify = notify;