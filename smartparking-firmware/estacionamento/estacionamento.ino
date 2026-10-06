#include <esp_now.h>
#include <WiFi.h>
#include <HTTPClient.h>   // Wi-Fi + HTTP POST para o servidor

// Credenciais (Wi-Fi, IP do servidor e MACs dos receptores).
// Copie "config.example.h" para "config.h" e preencha.
// O config.h NAO vai para o Git (esta no .gitignore).
#include "config.h"

// Controle de reconexao (usa millis(), nao bloqueia o loop)
unsigned long ultimaTentativaWiFi = 0;
const unsigned long INTERVALO_RECONEXAO = 5000;  // 5 segundos
bool wifiConectado = false;

// =========================
// TIPOS DE MENSAGEM
// =========================
#define MSG_VAGA     0
#define MSG_LOTADO   1
#define MSG_LIBERADO 2
#define MSG_CANCELA  3
#define MSG_STATUS   4   // NOVO: número de vagas livres

typedef struct {
  uint8_t tipo;
  char vaga[5];
  char estado[12];
  bool preferencial;
  uint8_t vagasLivres;   // NOVO
} Mensagem;

// =========================
// PINOS
// =========================
const int trigA01 = 25;
const int echoA01 = 34;
const int ledVerdeA01 = 26;
const int ledVermelhoA01 = 27;

const int trigA02 = 14;
const int echoA02 = 35;
const int ledVerdeA02 = 32;
const int ledVermelhoA02 = 33;

const int trigA03 = 13;
const int echoA03 = 36;
const int ledAzulA03 = 23;
const int ledVermelhoA03 = 22;

// =========================
// PARÂMETROS
// =========================
const float distanciaOcupada = 8.0;
const int NUM_LEITURAS = 3;
const int ESTABILIDADE = 2;

// =========================
// ESTRUTURA DAS VAGAS
// =========================
struct Vaga {
  const char* nome;
  int trig;
  int echo;
  int ledLivre;
  int ledOcupado;
  bool ocupada;
  int contadorOcupada;
  int contadorLivre;
  bool preferencial;
  float ultimaDistancia;   // NOVO: ultima leitura real do sensor (para o POST)
};

Vaga vagaA01 = { "A01", trigA01, echoA01, ledVerdeA01, ledVermelhoA01, false, 0, 0, false, 0 };
Vaga vagaA02 = { "A02", trigA02, echoA02, ledVerdeA02, ledVermelhoA02, false, 0, 0, false, 0 };
Vaga vagaA03 = { "A03", trigA03, echoA03, ledAzulA03,  ledVermelhoA03, false, 0, 0, true,  0 };

bool estadoLotadoAnterior = false;
int ultimoNumeroLivres = -1;   // NOVO

// =========================
// CALLBACK DE ENVIO
// =========================
#if ESP_ARDUINO_VERSION_MAJOR >= 3
void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
#else
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
#endif
}

// =========================
// ENVIAR MENSAGEM
// =========================
void enviarMensagem(uint8_t* mac, uint8_t tipo, const char* vaga, const char* estado, bool preferencial, uint8_t vagasLivres) {
  Mensagem msg;
  msg.tipo = tipo;
  strncpy(msg.vaga, vaga, sizeof(msg.vaga) - 1);
  msg.vaga[sizeof(msg.vaga) - 1] = '\0';
  strncpy(msg.estado, estado, sizeof(msg.estado) - 1);
  msg.estado[sizeof(msg.estado) - 1] = '\0';
  msg.preferencial = preferencial;
  msg.vagasLivres = vagasLivres;

  esp_now_send(mac, (uint8_t*)&msg, sizeof(msg));
}

// =========================
// Wi-Fi (NOVO - Parte 5)
// =========================

// Tenta conectar ao Wi-Fi sem travar o loop (millis, nao delay)
void conectarWiFi() {
  if (wifiConectado) return;

  unsigned long agora = millis();

  // So tenta de novo apos o intervalo de 5 segundos
  if (agora - ultimaTentativaWiFi < INTERVALO_RECONEXAO) return;
  ultimaTentativaWiFi = agora;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(">> Wi-Fi: tentando conectar...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// Verifica o estado do Wi-Fi a cada ciclo do loop
// Se cair, agenda reconexao; se voltar, sincroniza as vagas
void verificarWiFi() {
  bool agoraConectado = (WiFi.status() == WL_CONNECTED);

  // Transicao desconectado -> conectado
  if (agoraConectado && !wifiConectado) {
    wifiConectado = true;
    Serial.print(">> Wi-Fi conectado! IP: ");
    Serial.println(WiFi.localIP());
    sincronizarVagas();  // envia o estado atual das 3 vagas ao reconectar
  }

  // Transicao conectado -> desconectado
  if (!agoraConectado && wifiConectado) {
    wifiConectado = false;
    Serial.println(">> Wi-Fi CAIU! ESP-NOW continua funcionando. Tentando reconectar...");
  }

  // Se caiu, tenta reconectar (sem bloquear o loop)
  if (!wifiConectado) {
    conectarWiFi();
  }
}

// Envia o estado atual de todas as vagas (usado ao reconectar)
void sincronizarVagas() {
  enviarParaServidor(vagaA01.nome, vagaA01.ocupada, vagaA01.preferencial, vagaA01.ultimaDistancia);
  enviarParaServidor(vagaA02.nome, vagaA02.ocupada, vagaA02.preferencial, vagaA02.ultimaDistancia);
  enviarParaServidor(vagaA03.nome, vagaA03.ocupada, vagaA03.preferencial, vagaA03.ultimaDistancia);
}

// HTTP POST para o servidor Node.js
// Envia o estado + a DISTANCIA REAL do sensor HC-SR04 + o MAC do ESP32
// Timeout curto (3s) para nao travar o loop. Falha = so log no serial.
void enviarParaServidor(const char* vaga, bool ocupada, bool preferencial, float distanciaCm) {
  if (!wifiConectado) {
    Serial.println(">> HTTP: ignorado (Wi-Fi desconectado)");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // JSON esperado pela API:
  // {"vaga":"A01","ocupada":true,"preferencial":false,"distanciaCm":5.2,"macAddress":"4C:C3:82:ED:33:C0"}
  char corpo[160];
  snprintf(corpo, sizeof(corpo),
           "{\"vaga\":\"%s\",\"ocupada\":%s,\"preferencial\":%s,\"distanciaCm\":%.1f,\"macAddress\":\"%s\"}",
           vaga,
           ocupada ? "true" : "false",
           preferencial ? "true" : "false",
           distanciaCm,
           WiFi.macAddress().c_str());

  Serial.print(">> POST ");
  Serial.println(corpo);

  http.setTimeout(3000);
  int codigo = http.POST(corpo);

  if (codigo > 0) {
    if (codigo == 200) {
      Serial.printf(">> POST OK: %s %s (%.1f cm)\n", vaga, ocupada ? "OCUPADA" : "LIVRE", distanciaCm);
    } else {
      Serial.printf(">> POST respondeu HTTP %d\n", codigo);
    }
  } else {
    Serial.printf(">> POST FALHOU (%s) - tenta na proxima mudanca\n",
                  http.errorToString(codigo).c_str());
  }

  http.end();
}

// =========================
// MEDIR DISTÂNCIA
// =========================
float medirDistancia(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duracao = pulseIn(echo, HIGH, 30000);
  if (duracao == 0) return -1;
  return duracao * 0.0343 / 2;
}

float medirDistanciaMedia(int trig, int echo) {
  float soma = 0;
  int validas = 0;
  for (int i = 0; i < NUM_LEITURAS; i++) {
    float d = medirDistancia(trig, echo);
    if (d > 0) { soma += d; validas++; }
    delay(20);
  }
  if (validas == 0) return -1;
  return soma / validas;
}

// =========================
// CONTAR VAGAS LIVRES
// =========================
int contarVagasLivres() {
  int livres = 0;
  if (!vagaA01.ocupada) livres++;
  if (!vagaA02.ocupada) livres++;
  if (!vagaA03.ocupada) livres++;
  return livres;
}

// =========================
// ENVIAR STATUS GERAL (unificado)
// =========================
void enviarStatus() {
  int livres = contarVagasLivres();
  bool lotadoAgora = (livres == 0);

  // Envia SEMPRE (não só quando muda)
  enviarMensagem(macRobo, MSG_STATUS, "", "", false, livres);
  enviarMensagem(macCancela, MSG_STATUS, "", "", false, livres);

  // Printa no serial só quando muda
  if (livres != ultimoNumeroLivres) {
    Serial.print(">> Enviado STATUS: ");
    Serial.print(livres);
    Serial.println(" vagas livres");
    ultimoNumeroLivres = livres;
  }

  // Envia LOTADO/LIBERADO só quando muda
  if (lotadoAgora && !estadoLotadoAnterior) {
    enviarMensagem(macRobo, MSG_LOTADO, "", "LOTADO", false, 0);
    enviarMensagem(macCancela, MSG_LOTADO, "", "LOTADO", false, 0);
    Serial.println(">> Enviado LOTADO");
  }
  else if (!lotadoAgora && estadoLotadoAnterior) {
    enviarMensagem(macRobo, MSG_LIBERADO, "", "LIBERADO", false, 0);
    enviarMensagem(macCancela, MSG_LIBERADO, "", "LIBERADO", false, 0);
    Serial.println(">> Enviado LIBERADO");
  }

  estadoLotadoAnterior = lotadoAgora;
}

// =========================
// ATUALIZAR VAGA
// =========================
void atualizarVaga(Vaga &v) {
  float distancia = medirDistanciaMedia(v.trig, v.echo);
  v.ultimaDistancia = distancia;   // NOVO: guarda a leitura real do sensor

  char prefixo[16];
  if (v.preferencial) snprintf(prefixo, sizeof(prefixo), "%s [PREF]", v.nome);
  else snprintf(prefixo, sizeof(prefixo), "%s", v.nome);

  if (distancia == -1) {
    Serial.print(prefixo);
    Serial.println(": SEM LEITURA");
    return;
  }

  char linha[80];
  snprintf(linha, sizeof(linha), "%s: %5.1f cm -> ", prefixo, distancia);
  Serial.print(linha);

  if (distancia <= distanciaOcupada) {
    v.contadorOcupada++;
    v.contadorLivre = 0;

    if (!v.ocupada && v.contadorOcupada >= ESTABILIDADE) {
      v.ocupada = true;
      Serial.println("OCUPADA");
      digitalWrite(v.ledLivre, LOW);
      digitalWrite(v.ledOcupado, HIGH);
      // ESP-NOW (robo + cancela)
      enviarMensagem(macRobo, MSG_VAGA, v.nome, "OCUPADA", v.preferencial, 0);
      enviarMensagem(macCancela, MSG_VAGA, v.nome, "OCUPADA", v.preferencial, 0);
      // HTTP (servidor Node.js) - envia a distancia REAL do sensor
      enviarParaServidor(v.nome, v.ocupada, v.preferencial, v.ultimaDistancia);
    } else {
      Serial.println("ocupada (confirmando...)");
    }
  } else {
    v.contadorLivre++;
    v.contadorOcupada = 0;

    if (v.ocupada && v.contadorLivre >= ESTABILIDADE) {
      v.ocupada = false;
      Serial.println("LIVRE");
      digitalWrite(v.ledLivre, HIGH);
      digitalWrite(v.ledOcupado, LOW);
      // ESP-NOW (robo + cancela)
      enviarMensagem(macRobo, MSG_VAGA, v.nome, "LIVRE", v.preferencial, 0);
      enviarMensagem(macCancela, MSG_VAGA, v.nome, "LIVRE", v.preferencial, 0);
      // HTTP (servidor Node.js) - envia a distancia REAL do sensor
      enviarParaServidor(v.nome, v.ocupada, v.preferencial, v.ultimaDistancia);
    } else {
      Serial.println("livre (confirmando...)");
    }
  }
}

// =========================
// SETUP
// =========================
void setup() {
  Serial.begin(115200);

  pinMode(trigA01, OUTPUT); pinMode(echoA01, INPUT);
  pinMode(ledVerdeA01, OUTPUT); pinMode(ledVermelhoA01, OUTPUT);

  pinMode(trigA02, OUTPUT); pinMode(echoA02, INPUT);
  pinMode(ledVerdeA02, OUTPUT); pinMode(ledVermelhoA02, OUTPUT);

  pinMode(trigA03, OUTPUT); pinMode(echoA03, INPUT);
  pinMode(ledAzulA03, OUTPUT); pinMode(ledVermelhoA03, OUTPUT);

  digitalWrite(ledVerdeA01, HIGH); digitalWrite(ledVermelhoA01, LOW);
  digitalWrite(ledVerdeA02, HIGH); digitalWrite(ledVermelhoA02, LOW);
  digitalWrite(ledAzulA03, HIGH);  digitalWrite(ledVermelhoA03, LOW);

  WiFi.mode(WIFI_STA);

  // NOVO - Parte 5: inicia a conexao Wi-Fi (em background, sem travar)
  conectarWiFi();

  if (esp_now_init() != ESP_OK) {
    Serial.println("Erro ao inicializar ESP-NOW");
    return;
  }

  esp_now_register_send_cb(OnDataSent);

  esp_now_peer_info_t peerInfo;
  memset(&peerInfo, 0, sizeof(peerInfo));
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  memcpy(peerInfo.peer_addr, macRobo, 6);
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Falha ao adicionar peer ROBÔ");
  }

  memcpy(peerInfo.peer_addr, macCancela, 6);
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Falha ao adicionar peer CANCELA");
  }

  Serial.println("================================");
  Serial.println("  SMARTPARKING - 3 VAGAS");
  Serial.println("  Wi-Fi + ESP-NOW (Parte 5)");
  Serial.println("================================");

  // Envia status inicial
  ultimoNumeroLivres = -1;
  enviarStatus();
}

// =========================
// LOOP
// =========================
void loop() {
  // NOVO - Parte 5: mantem o Wi-Fi vivo (reconecta sozinho em 5s)
  verificarWiFi();

  Serial.println();
  Serial.println("========== LEITURA ==========");

  atualizarVaga(vagaA01);
  delay(50);
  atualizarVaga(vagaA02);
  delay(50);
  atualizarVaga(vagaA03);
  delay(50);

  enviarStatus();

  Serial.println("-----------------------------");
  Serial.print("RESUMO -> ");
  Serial.print(vagaA01.nome); Serial.print(": ");
  Serial.print(vagaA01.ocupada ? "OCUPADA" : "LIVRE");
  Serial.print(" | ");
  Serial.print(vagaA02.nome); Serial.print(": ");
  Serial.print(vagaA02.ocupada ? "OCUPADA" : "LIVRE");
  Serial.print(" | ");
  Serial.print(vagaA03.nome);
  if (vagaA03.preferencial) Serial.print(" [PREF]");
  Serial.print(": ");
  Serial.println(vagaA03.ocupada ? "OCUPADA" : "LIVRE");

  delay(1000);
}