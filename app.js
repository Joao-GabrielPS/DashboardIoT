const mqtt_server = "c28d5a3ca24a4d259fca9e54afea7665.s1.eu.hivemq.cloud"
const mqtt_port = 8884
const mqtt_username = "Dog_mals"
const mqtt_password = "Jurema10"
const mqtt_topic = "HydroMonitor/Ultrassonico"

const client = mqtt.connect(`wss://${mqtt_server}:${mqtt_port}/mqtt`, {
    username: mqtt_username,
    password: mqtt_password
});


client.on("connect", () => {
    console.log("Conectado ao broker MQTT");
    document.getElementById("status").innerText = "Conectado";
    document.getElementById("status").className = "badge bg-success";
    // Inscreve no tópico
    client.subscribe(topic, (erro) => {
        if (erro) {
            console.log("Erro ao inscrever no tópico", erro);
        } else {
            console.log("Inscrito no tópico:", topic);
        }
    });
});

client.on("message", (topic, message) => {
    const texto = message.toString();
    console.log("Mensagem recebida:", texto);
    document.getElementById("mensagem").innerText = texto;
});

