const mqtt_server = "c54e67b060694c4aa2ef3f6b1707d2a2.s1.eu.hivemq.cloud";
const mqtt_port = 8884;
const mqtt_username = "Dog_mals";
const mqtt_password = "Jurema10";
const mqtt_topic = "HydroMonitor/Ultrassonico";

// Conexão com o broker MQTT
const client = mqtt.connect(`wss://${mqtt_server}:${mqtt_port}/mqtt`, {
    username: mqtt_username,
    password: mqtt_password
});

// Quando conectar ao broker
client.on("connect", () => {
    console.log("Conectado ao broker MQTT");

    document.getElementById("status").innerText = "Conectado";
    document.getElementById("status").className = "badge bg-success";

    // Inscreve no tópico
    client.subscribe(mqtt_topic, (erro) => {
        if (erro) {
            console.log("Erro ao inscrever no tópico:", erro);
        } else {
            console.log("Inscrito no tópico:", mqtt_topic);
        }
    });
});

// Recebe mensagens do broker
client.on("message", (topic, message) => {
    const texto = message.toString();

    console.log(`Mensagem recebida do tópico ${topic}: ${texto}`);

    // Exibe a mensagem na página
    document.getElementById("mensagem").innerText = texto;
});

// Caso a conexão seja perdida
client.on("offline", () => {
    console.log("Cliente MQTT offline");

    document.getElementById("status").innerText = "Offline";
    document.getElementById("status").className = "badge bg-secondary";
});

// Caso ocorra algum erro
client.on("error", (erro) => {
    console.log("Erro MQTT:", erro);

    document.getElementById("status").innerText = "Erro";
    document.getElementById("status").className = "badge bg-danger";
});

// Reconectando automaticamente
client.on("reconnect", () => {
    console.log("Tentando reconectar ao broker...");

    document.getElementById("status").innerText = "Reconectando...";
    document.getElementById("status").className = "badge bg-warning";
});