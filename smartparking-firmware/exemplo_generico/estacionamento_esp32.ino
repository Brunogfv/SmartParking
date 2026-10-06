// ============================================================
// SMARTPARKING - Firmware ESP32 (DevKitC / WROOM-32)
// Exemplo generico: Wi-Fi + HTTP POST para o servidor Node.js
// SEM remover o ESP-NOW (robo + cancela continuam funcionando)
//
// COMO USAR ESTE ARQUIVO:
// 1. Copie "config.example.h" para "config.h" e preencha
//    (Wi-Fi, IP do servidor e MAC do receptor ESP-NOW)
// 2. Adapte os pinos dos sensores/LEDs ao seu circuito
// 3. Onde houver comentarios "SUA LOGICA AQUI", encaixe o codigo
//    do seu firmware atual (filtro de estabilidade, mensagens
//    ESP-NOW, etc.)
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_now.h>

// Credenciais locais (NAO versionadas - ver config.example.h)
#include "config.h"

// ---------- PINOS (ADAPTAR ao seu circuito) ----------
const int PIN_TRIG_A01 = 4;
const int PIN_ECHO_A01 = 5;
const int PIN_TRIG_A02 = 18;
const int PIN_ECHO_A02 = 19;
const int PIN_TRIG_A03 = 23;
const int PIN_ECHO_A03 = 22;
const int PIN_LED_VERDE = 26;
const int PIN_LED_AZUL = 27;
const int PIN_LED_VERMELHO = 25;

// ---------- LIMIARES ----------
const float DIST_OCUPADA_CM = 15.0;   // abaixo disso = ocupada
const int LEITURAS_ESTABILIDADE = 3;  // confirmacoes para mudar estado

// ---------- CONTROLE DE RECONEXAO Wi-Fi (nao bloqueia o loop) ----------
unsigned long ultimaTentativaWiFi = 0;
const unsigned long INTERVALO_RECONEXAO = 5000;  // 5 segundos
bool wifiConectado = false;

// ---------- ESTRUTURA DA MENSAGEM ESP-NOW (ajuste ao seu formato) ----------
typedef struct {
  char vaga[4];
  bool ocupada;
  bool preferencial;
  int totalLivres;
} MensagemEspNow;

MensagemEspNow mensagemSaida;

// ---------- ESTADO DAS VAGAS ----------
struct Vaga {
  char codigo[4];
  bool preferencial;
  bool ocupada;
  bool ocupadaAnterior;
  int leiturasConfirmadas;
};

Vaga vagas[3] = {
  { "A01", false, false, false, 0 },
  { "A02", false, false, false, 0 },
  { "A03", true,  false, false, 0 }
};

// ============================================================
// FUNCAO: conectarWiFi() - tenta conectar (sem delay longo)
// ============================================================
void conectarWiFi() {
  if (wifiConectado) return;  // ja conectado

  unsigned long agora = millis();

  // So tenta de novo apos o intervalo (evita loop travado)
  if (agora - ultimaTentativaWiFi < INTERVALO_RECONEXAO) return;
  ultimaTentativaWiFi = agora;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(">> Wi-Fi: tentando conectar...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// ============================================================
// FUNCAO: verificarWiFi() - chama no loop() a cada ciclo
// Atualiza a flag wifiConectado conforme o estado real
// ============================================================
void verificarWiFi() {
  bool agoraConectado = (WiFi.status() == WL_CONNECTED);

  // Transicao desconectado -> conectado
  if (agoraConectado && !wifiConectado) {
    wifiConectado = true;
    Serial.print(">> Wi-Fi conectado! IP: ");
    Serial.println(WiFi.localIP());
  }

  // Transicao conectado -> desconectado
  if (!agoraConectado && wifiConectado) {
    wifiConectado = false;
    Serial.println(">> Wi-Fi CAIU! ESP-NOW continua funcionando. Tentando reconectar...");
  }

  // Se caiu, agenda nova tentativa (millis, nao bloqueia)
  if (!wifiConectado) {
    conectarWiFi();
  }
}

// ============================================================
// FUNCAO: enviarParaServidor() - POST HTTP para o Node.js
// So envia se o Wi-Fi estiver conectado. Timeout curto para
// nao travar o loop. Falha = so log no serial.
// ============================================================
void enviarParaServidor(const char* vaga, bool ocupada, bool preferencial) {
  if (!wifiConectado) {
    Serial.println(">> HTTP: ignorado (Wi-Fi desconectado)");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Monta o JSON exatamente como a API espera
  char corpo[80];
  snprintf(corpo, sizeof(corpo),
           "{\"vaga\":\"%s\",\"ocupada\":%s,\"preferencial\":%s}",
           vaga,
           ocupada ? "true" : "false",
           preferencial ? "true" : "false");

  Serial.print(">> POST ");
  Serial.print(vaga);
  Serial.print(" -> ");
  Serial.println(corpo);

  // Timeout curto: se o servidor nao responder em 3s, desiste
  http.setTimeout(3000);
  int codigo = http.POST(corpo);

  if (codigo > 0) {
    if (codigo == 200) {
      Serial.printf(">> POST OK: %s %s\n", vaga, ocupada ? "OCUPADA" : "LIVRE");
    } else {
      Serial.printf(">> POST respondeu HTTP %d (servidor ok, porem ocupado/erro)\n", codigo);
    }
  } else {
    Serial.printf(">> POST FALHOU (%s) - tenta na proxima mudanca\n", http.errorToString(codigo).c_str());
  }

  http.end();
}

// ============================================================
// FUNCAO: lerSensor() - leitura do HC-SR04
// ============================================================
float lerSensor(int pinTrig, int pinEcho) {
  digitalWrite(pinTrig, LOW);
  delayMicroseconds(2);
  digitalWrite(pinTrig, HIGH);
  delayMicroseconds(10);
  digitalWrite(pinTrig, LOW);

  long duracao = pulseIn(pinEcho, HIGH, 30000);  // timeout 30ms
  if (duracao == 0) return 999.0;                // sem eco = sem obstaculo
  return duracao * 0.034 / 2.0;
}

// ============================================================
// FUNCAO: enviarMensagemEspNow() - ENCAIXAR SUA LOGICA AQUI
// Exemplo basico de envio via ESP-NOW (ajuste o formato e o
// destino para o seu firmware real)
// ============================================================
void enviarMensagemEspNow(const char* vaga, bool ocupada, bool preferencial, int totalLivres) {
  strncpy(mensagemSaida.vaga, vaga, 3);
  mensagemSaida.vaga[3] = '\0';
  mensagemSaida.ocupada = ocupada;
  mensagemSaida.preferencial = preferencial;
  mensagemSaida.totalLivres = totalLivres;

  esp_err_t resultado = esp_now_send(MAC_ROBO_CANCELA, (uint8_t*)&mensagemSaida, sizeof(mensagemSaida));
  if (resultado == ESP_OK) {
    Serial.printf(">> ESP-NOW enviado: %s %s\n", vaga, ocupada ? "OCUPADA" : "LIVRE");
  } else {
    Serial.printf(">> ESP-NOW FALHOU (%d) - continua tentando\n", resultado);
  }
}

// ============================================================
// FUNCAO: atualizarVaga() - filtro de estabilidade + acoes
// Chamada quando a leitura de uma vaga muda.
// ENCAIXE AQUI a sua logica atual de estabilidade/LEDs.
// ============================================================
void atualizarVaga(int indice, bool novaLeitura) {
  Vaga& v = vagas[indice];

  // Filtro de estabilidade: so confirma apos N leituras iguais
  if (novaLeitura == v.ocupada) {
    v.leiturasConfirmadas = 0;  // voltou ao mesmo estado, zera
    return;
  }

  v.leiturasConfirmadas++;
  if (v.leiturasConfirmadas < LEITURAS_ESTABILIDADE) return;

  // Estado confirmado -> aplica a mudanca
  v.ocupada = novaLeitura;
  v.ocupadaAnterior = v.ocupada;
  v.leiturasConfirmadas = 0;

  Serial.printf("%s -> %s\n", v.codigo, v.ocupada ? "OCUPADA" : "LIVRE");

  // Conta vagas livres para a mensagem ESP-NOW
  int livres = 0;
  for (int i = 0; i < 3; i++) {
    if (!vagas[i].ocupada) livres++;
  }

  // ENVIA PELOS DOIS CAMINHOS (sempre que muda de estado):
  enviarMensagemEspNow(v.codigo, v.ocupada, v.preferencial, livres);  // ESP-NOW (robo/cancela)
  enviarParaServidor(v.codigo, v.ocupada, v.preferencial);            // HTTP (servidor Node.js)

  // SUA LOGICA AQUI: controle dos LEDs (verde/azul/vermelho)
  atualizarLeds();
}

// ============================================================
// FUNCAO: atualizarLeds() - SUA LOGICA AQUI
// Verde = ha vaga livre | Azul = preferencial livre | Vermelho = lotado
// ============================================================
void atualizarLeds() {
  int livres = 0;
  for (int i = 0; i < 3; i++) if (!vagas[i].ocupada) livres++;

  if (livres == 0) {
    digitalWrite(PIN_LED_VERDE, LOW);
    digitalWrite(PIN_LED_AZUL, LOW);
    digitalWrite(PIN_LED_VERMELHO, HIGH);  // LOTADO
    Serial.println(">> ESTACIONAMENTO LOTADO!");
  } else {
    digitalWrite(PIN_LED_VERMELHO, LOW);
    if (vagas[2].ocupada) {  // preferencial ocupada
      digitalWrite(PIN_LED_AZUL, LOW);
      digitalWrite(PIN_LED_VERDE, HIGH);
    } else {
      digitalWrite(PIN_LED_AZUL, HIGH);  // preferencial livre
      digitalWrite(PIN_LED_VERDE, LOW);
    }
  }
}

// ============================================================
// CALLBACKS ESP-NOW (necessarios para o ESP-NOW funcionar)
// ============================================================
void onDataSent(const uint8_t* mac, esp_now_send_status_t status) {
  // SUA LOGICA AQUI se quiser tratar confirmacao de entrega
}

void onDataRecv(const uint8_t* mac, const uint8_t* dados, int tamanho) {
  // SUA LOGICA AQUI se o estacionamento receber mensagens
  // (ex: comando do robo) - na Parte 5 normalmente nao recebe
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("===============================");
  Serial.println("  SMARTPARKING - 3 VAGAS (Parte 5)");
  Serial.println("  Wi-Fi + ESP-NOW em paralelo");
  Serial.println("===============================");

  // Pinos dos sensores
  pinMode(PIN_TRIG_A01, OUTPUT);
  pinMode(PIN_ECHO_A01, INPUT);
  pinMode(PIN_TRIG_A02, OUTPUT);
  pinMode(PIN_ECHO_A02, INPUT);
  pinMode(PIN_TRIG_A03, OUTPUT);
  pinMode(PIN_ECHO_A03, INPUT);

  // Pinos dos LEDs
  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_AZUL, OUTPUT);
  pinMode(PIN_LED_VERMELHO, OUTPUT);

  // 1) Wi-Fi (a conexao e feita em background pelo conectarWiFi)
  WiFi.mode(WIFI_STA);
  conectarWiFi();

  // 2) ESP-NOW continua funcionando normalmente
  if (esp_now_init() != ESP_OK) {
    Serial.println(">> ERRO ao inicializar ESP-NOW");
  } else {
    esp_now_register_send_cb(onDataSent);
    esp_now_register_recv_cb(onDataRecv);
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, MAC_ROBO_CANCELA, 6);
    peer.channel = 0;
    peer.encrypt = false;
    esp_now_add_peer(&peer);
    Serial.println(">> ESP-NOW pronto (robo + cancela)");
  }
}

// ============================================================
// LOOP - sem delay() longo! millis() para tudo.
// ============================================================
void loop() {
  // 1) Mantem o Wi-Fi vivo (reconecta sozinho a cada 5s se cair)
  verificarWiFi();

  // 2) Le as 3 vagas e aplica o filtro de estabilidade
  static const int trigs[3] = { PIN_TRIG_A01, PIN_TRIG_A02, PIN_TRIG_A03 };
  static const int echos[3] = { PIN_ECHO_A01, PIN_ECHO_A02, PIN_ECHO_A03 };

  for (int i = 0; i < 3; i++) {
    float distancia = lerSensor(trigs[i], echos[i]);
    bool ocupada = (distancia < DIST_OCUPADA_CM);

    // Log das leituras (ex: A01: 24.5 cm -> LIVRE)
    Serial.printf("%s: %.1f cm -> %s\n", vagas[i].codigo, distancia,
                  ocupada ? "OCUPADA" : "LIVRE");

    atualizarVaga(i, ocupada);
  }

  // 3) Pequena pausa entre ciclos de leitura (evita eco do sensor)
  delay(200);
}