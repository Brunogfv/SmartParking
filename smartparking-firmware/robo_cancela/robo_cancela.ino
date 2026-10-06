#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <esp_now.h>
#include <WiFi.h>
#include <ESP32Servo.h>

// =========================
// Wi-Fi
// IMPORTANTE: o robo/cancela nao envia HTTP, mas PRECISA se conectar
// ao MESMO Wi-Fi do estacionamento para ficar no mesmo CANAL do
// ESP-NOW. Sem isso, o robo nao receberia mais as mensagens quando
// o estacionamento se conecta ao roteador (que usa outro canal).
// Copie "config.example.h" para "config.h" e preencha (o config.h
// NAO vai para o Git).
// =========================
#include "config.h"

// =========================
// TIPOS DE MENSAGEM
// =========================
#define MSG_VAGA     0
#define MSG_LOTADO   1
#define MSG_LIBERADO 2
#define MSG_CANCELA  3
#define MSG_STATUS   4

typedef struct {
  uint8_t tipo;
  char vaga[5];
  char estado[12];
  bool preferencial;
  uint8_t vagasLivres;
} Mensagem;

volatile bool novaMensagem = false;
Mensagem mensagemESPNow;

// =========================
// DISPLAY OLED
// =========================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// =========================
// CANCELA - SERVOS
// =========================
Servo servoEntrada;
Servo servoSaida;

#define PINO_SERVO_ENTRADA 18
#define PINO_SERVO_SAIDA   19

// =========================
// CANCELA - SENSORES
// =========================
#define TRIG_ENTRADA 32
#define ECHO_ENTRADA 34
#define TRIG_SAIDA   25
#define ECHO_SAIDA   35

// =========================
// CANCELA - LED INDICADOR
// =========================
#define LED_INDICADOR_VERDE    26
#define LED_INDICADOR_VERMELHO 27

// =========================
// CANCELA - PARÂMETROS
// =========================
const float distanciaCarro = 8.0;          // reduzido de 15 para 8 cm
const unsigned long tempoAberta = 3000;
const unsigned long tempoEntreLeituras = 200;

bool estacionamentoLotado = false;
int vagasLivresAtual = 3;

bool cancelaEntradaAberta = false;
bool cancelaSaidaAberta = false;
unsigned long inicioAberturaEntrada = 0;
unsigned long inicioAberturaSaida = 0;
unsigned long ultimaLeitura = 0;

// =========================
// ROBÔ - ESTADOS
// =========================
enum Estado {
  NORMAL,
  SURPRESO,
  FELIZ,
  DORMINDO,
  ACORDANDO
};

Estado estadoAtual = NORMAL;

// =========================
// ROBÔ - POSIÇÃO DOS OLHOS
// =========================
int offsetX = 0;
int offsetY = 0;
int alvoX = 0;
int alvoY = 0;
int ultimoAlvoX = 0;
int ultimoAlvoY = 0;

// =========================
// ROBÔ - TEMPOS
// =========================
unsigned long ultimoMovimento = 0;
unsigned long ultimoAlvo = 0;
unsigned long tempoOlhando = 2000;
unsigned long intervaloMovimento = 100;

unsigned long ultimoMicroMovimento = 0;
unsigned long intervaloMicroMovimento = 500;

unsigned long ultimoPiscar = 0;
unsigned long intervaloPiscada = 4000;
bool piscando = false;

unsigned long inicioSurpresa = 0;
unsigned long tempoSurpreso = 1500;
unsigned long ultimaExpressao = 0;
unsigned long intervaloExpressao = 5000;

unsigned long inicioFeliz = 0;
unsigned long tempoFeliz = 0;

unsigned long ultimoAtividade = 0;
unsigned long tempoParaDormir = 15000;
unsigned long ultimoSono = 0;
int etapaSono = 0;
unsigned long inicioSono = 0;
unsigned long tempoDormindo = 8000;

unsigned long ultimoAcordando = 0;
int etapaAcordando = 0;

unsigned long duracaoMensagem = 3000;

// =========================
// CALLBACK ESP-NOW
// =========================
#if ESP_ARDUINO_VERSION_MAJOR >= 3
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
#endif
  if (len == sizeof(Mensagem)) {
    memcpy(&mensagemESPNow, data, sizeof(mensagemESPNow));
    novaMensagem = true;
  }
}

// ======================================================
// FUNÇÕES DO ROBÔ (DISPLAY)
// ======================================================
void desenhaOlhos(int offsetX, int offsetY, int altura) {
  display.clearDisplay();
  display.fillRoundRect(25 + offsetX, 15 + offsetY, 25, altura, 8, SSD1306_WHITE);
  display.fillRoundRect(78 + offsetX, 15 + offsetY, 25, altura, 8, SSD1306_WHITE);

  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 56);
  display.print("Livres: ");
  display.print(vagasLivresAtual);
  display.print("/3");

  display.display();
}

void desenhaSono() {
  display.clearDisplay();
  display.fillRoundRect(25, 30, 25, 3, 2, SSD1306_WHITE);
  display.fillRoundRect(78, 30, 25, 3, 2, SSD1306_WHITE);
  display.setTextColor(SSD1306_WHITE);

  if (etapaSono == 0) {
    display.setTextSize(1);
    display.setCursor(105, 15);
    display.println("z");
  }
  if (etapaSono == 1) {
    display.setTextSize(2);
    display.setCursor(100, 10);
    display.println("Z");
  }
  if (etapaSono == 2) {
    display.setTextSize(1);
    display.setCursor(88, 5);
    display.println("ZZZ");
  }

  display.setTextSize(1);
  display.setCursor(0, 56);
  display.print("Livres: ");
  display.print(vagasLivresAtual);
  display.print("/3");

  display.display();
}

void desenhaAcordando() {
  display.clearDisplay();
  int altura;
  if (etapaAcordando == 0) altura = 3;
  if (etapaAcordando == 1) altura = 10;
  if (etapaAcordando == 2) altura = 20;
  if (etapaAcordando == 3) altura = 30;

  display.fillRoundRect(25, 30 - altura / 2, 25, altura, 8, SSD1306_WHITE);
  display.fillRoundRect(78, 30 - altura / 2, 25, altura, 8, SSD1306_WHITE);

  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 56);
  display.print("Livres: ");
  display.print(vagasLivresAtual);
  display.print("/3");

  display.display();
}

void desenhaSurpreso() {
  display.clearDisplay();
  display.fillRoundRect(23, 8, 29, 44, 10, SSD1306_WHITE);
  display.fillRoundRect(76, 8, 29, 44, 10, SSD1306_WHITE);

  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 56);
  display.print("Livres: ");
  display.print(vagasLivresAtual);
  display.print("/3");

  display.display();
}

void desenhaFeliz() {
  display.clearDisplay();
  display.drawLine(18, 38, 25, 30, SSD1306_WHITE);
  display.drawLine(25, 30, 35, 38, SSD1306_WHITE);
  display.drawLine(75, 38, 85, 30, SSD1306_WHITE);
  display.drawLine(85, 30, 95, 38, SSD1306_WHITE);

  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 56);
  display.print("Livres: ");
  display.print(vagasLivresAtual);
  display.print("/3");

  display.display();
}

void desenhaIconeAcessibilidade(int x, int y) {
  display.fillCircle(x + 6, y, 2, SSD1306_WHITE);
  display.drawLine(x + 6, y + 2, x + 6, y + 8, SSD1306_WHITE);
  display.drawLine(x + 6, y + 4, x + 2, y + 6, SSD1306_WHITE);
  display.drawLine(x + 6, y + 8, x + 8, y + 12, SSD1306_WHITE);
  display.drawCircle(x + 6, y + 12, 4, SSD1306_WHITE);
}

void desenhaMensagem(String msg) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("SMARTPARKING");
  display.drawLine(0, 12, 128, 12, SSD1306_WHITE);

  display.setTextSize(2);
  display.setCursor(0, 22);
  if (msg.length() <= 8) {
    display.println(msg);
  } else {
    display.println(msg.substring(0, 8));
    display.setCursor(0, 45);
    display.println(msg.substring(8));
  }
  display.display();
}

void desenhaMensagemPreferencial(String msg) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("SMARTPARKING");
  display.drawLine(0, 12, 128, 12, SSD1306_WHITE);
  desenhaIconeAcessibilidade(110, 0);

  display.setTextSize(2);
  display.setCursor(0, 22);
  if (msg.length() <= 8) {
    display.println(msg);
  } else {
    display.println(msg.substring(0, 8));
    display.setCursor(0, 45);
    display.println(msg.substring(8));
  }
  display.display();
}

void desenhaMensagemDestaque(String msg) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("SMARTPARKING");
  display.drawLine(0, 12, 128, 12, SSD1306_WHITE);

  if (msg == "LOTADO") {
    display.drawRect(0, 16, 128, 48, SSD1306_WHITE);
    display.drawRect(1, 17, 126, 46, SSD1306_WHITE);
  }

  display.setTextSize(2);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(msg, 0, 0, &x1, &y1, &w, &h);
  int cursorX = (SCREEN_WIDTH - w) / 2;
  int cursorY = 30;

  display.setCursor(cursorX, cursorY);
  display.println(msg);
  display.display();
}

void redesenhaEstadoAtual() {
  if (estadoAtual == NORMAL) desenhaOlhos(offsetX, offsetY, 30);
  else if (estadoAtual == DORMINDO) desenhaSono();
  else if (estadoAtual == ACORDANDO) desenhaAcordando();
  else if (estadoAtual == SURPRESO) desenhaSurpreso();
  else if (estadoAtual == FELIZ) desenhaFeliz();
}

// ======================================================
// FUNÇÕES DO ROBÔ (MOVIMENTO)
// ======================================================
void escolherNovoAlvo() {
  int posicoesX[] = {-10, 0, 10};
  int posicoesY[] = {-8, 0, 8};
  int novoX;
  int novoY;
  int sorteio = random(0, 100);

  if (sorteio < 50) {
    novoX = 0;
    novoY = 0;
  }
  else if (sorteio < 70) {
    novoX = posicoesX[random(0, 3)];
    while (novoX == 0) novoX = posicoesX[random(0, 3)];
    novoY = 0;
  }
  else if (sorteio < 90) {
    novoX = 0;
    novoY = posicoesY[random(0, 3)];
    while (novoY == 0) novoY = posicoesY[random(0, 3)];
  }
  else {
    novoX = posicoesX[random(0, 3)];
    while (novoX == 0) novoX = posicoesX[random(0, 3)];
    novoY = posicoesY[random(0, 3)];
    while (novoY == 0) novoY = posicoesY[random(0, 3)];
  }

  if (novoX == ultimoAlvoX && novoY == ultimoAlvoY) {
    escolherNovoAlvo();
    return;
  }

  ultimoAlvoX = novoX;
  ultimoAlvoY = novoY;
  alvoX = novoX;
  alvoY = novoY;

  tempoOlhando = random(1000, 4000);

  bool movimentoHorizontal = offsetX != alvoX;
  bool movimentoVertical = offsetY != alvoY;

  if (movimentoHorizontal && movimentoVertical) intervaloMovimento = 80;
  else if (movimentoHorizontal) intervaloMovimento = 60;
  else if (movimentoVertical) intervaloMovimento = 120;
  else intervaloMovimento = 100;
}

bool chegouAoAlvo() {
  return (offsetX == alvoX && offsetY == alvoY);
}

void fazerMicroMovimento() {
  int movimentoX = random(-1, 2);
  int movimentoY = random(-1, 2);

  int novaPosicaoX = offsetX + movimentoX;
  int novaPosicaoY = offsetY + movimentoY;

  if (novaPosicaoX < -10) novaPosicaoX = -10;
  if (novaPosicaoX > 10) novaPosicaoX = 10;
  if (novaPosicaoY < -8) novaPosicaoY = -8;
  if (novaPosicaoY > 8) novaPosicaoY = 8;

  offsetX = novaPosicaoX;
  offsetY = novaPosicaoY;

  desenhaOlhos(offsetX, offsetY, 30);
}

// ======================================================
// FUNÇÕES DA CANCELA
// ======================================================
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

void abrirCancela(Servo &servo, bool &aberta, unsigned long &inicio) {
  servo.write(90);
  aberta = true;
  inicio = millis();
}

void fecharCancela(Servo &servo, bool &aberta) {
  servo.write(0);
  aberta = false;
}

void atualizaLedIndicador() {
  Serial.print(">> Atualizando LED. vagasLivresAtual = ");
  Serial.println(vagasLivresAtual);

  if (vagasLivresAtual > 0) {
    digitalWrite(LED_INDICADOR_VERDE, HIGH);
    digitalWrite(LED_INDICADOR_VERMELHO, LOW);
  } else {
    digitalWrite(LED_INDICADOR_VERDE, LOW);
    digitalWrite(LED_INDICADOR_VERMELHO, HIGH);
  }
}

// =========================
// VARIÁVEIS DE FILTRO
// =========================
int contadorEntrada = 0;
int contadorSaida = 0;
const int ESTABILIDADE_CANCELA = 3;   // aumentado de 2 para 3

// =========================
// VERIFICAR CANCELAS (com filtro)
// =========================
void verificarCancelas() {
  // ---------- ENTRADA ----------
  float distEntrada = medirDistancia(TRIG_ENTRADA, ECHO_ENTRADA);
  Serial.print("[ENTRADA] ");
  Serial.print(distEntrada);
  Serial.println(" cm");

  bool leituraValidaEntrada = (distEntrada > 5.0 && distEntrada < 50.0);

  if (leituraValidaEntrada && distEntrada < distanciaCarro) {
    contadorEntrada++;
  } else {
    contadorEntrada = 0;
  }

  if (contadorEntrada >= ESTABILIDADE_CANCELA && !cancelaEntradaAberta) {
    contadorEntrada = 0;

    if (!estacionamentoLotado) {
      Serial.println(">> Carro na ENTRADA - abrindo cancela");
      abrirCancela(servoEntrada, cancelaEntradaAberta, inicioAberturaEntrada);
    } else {
      Serial.println(">> Carro na ENTRADA, mas LOTADO");
    }
  }

  if (cancelaEntradaAberta && millis() - inicioAberturaEntrada >= tempoAberta) {
    Serial.println(">> Fechando cancela de ENTRADA");
    fecharCancela(servoEntrada, cancelaEntradaAberta);
  }

  // Delay para evitar interferência entre sensores
  delay(100);

  // ---------- SAÍDA ----------
  float distSaida = medirDistancia(TRIG_SAIDA, ECHO_SAIDA);
  Serial.print("[SAIDA]   ");
  Serial.print(distSaida);
  Serial.println(" cm");

  bool leituraValidaSaida = (distSaida > 5.0 && distSaida < 50.0);

  if (leituraValidaSaida && distSaida < distanciaCarro) {
    contadorSaida++;
  } else {
    contadorSaida = 0;
  }

  if (contadorSaida >= ESTABILIDADE_CANCELA && !cancelaSaidaAberta) {
    contadorSaida = 0;

    Serial.println(">> Carro na SAIDA - abrindo cancela");
    abrirCancela(servoSaida, cancelaSaidaAberta, inicioAberturaSaida);
  }

  if (cancelaSaidaAberta && millis() - inicioAberturaSaida >= tempoAberta) {
    Serial.println(">> Fechando cancela de SAIDA");
    fecharCancela(servoSaida, cancelaSaidaAberta);
  }
}

// ======================================================
// PROCESSAR MENSAGEM ESP-NOW
// ======================================================
void processarMensagemESPNow() {
  if (!novaMensagem) return;
  novaMensagem = false;

  // ----- STATUS -----
  if (mensagemESPNow.tipo == MSG_STATUS) {
    int vagasAnterior = vagasLivresAtual;
    vagasLivresAtual = mensagemESPNow.vagasLivres;
    estacionamentoLotado = (vagasLivresAtual == 0);

    Serial.print(">> Status: ");
    Serial.print(vagasLivresAtual);
    Serial.print(" vagas livres -> ");
    Serial.println(estacionamentoLotado ? "LOTADO" : "LIVRE");

    // Só atualiza LED e tela se o valor mudou
    if (vagasLivresAtual != vagasAnterior) {
      atualizaLedIndicador();
      if (estadoAtual == NORMAL) desenhaOlhos(offsetX, offsetY, 30);
    }

    return;
  }

  // ----- OUTRAS MENSAGENS -----
  String texto = "";
  bool destaque = false;
  bool preferencial = mensagemESPNow.preferencial;

  if (mensagemESPNow.tipo == MSG_VAGA) {
      texto = String(mensagemESPNow.vaga) + " " + String(mensagemESPNow.estado);
  } else if (mensagemESPNow.tipo == MSG_LOTADO) {
      estacionamentoLotado = true;
      vagasLivresAtual = 0;
      atualizaLedIndicador();            // <-- NOVO
      texto = "LOTADO";
      destaque = true;
      Serial.println(">> Estacionamento LOTADO");
  } else if (mensagemESPNow.tipo == MSG_LIBERADO) {
      estacionamentoLotado = false;
      // Não sabe quantas livres, mas sabemos que pelo menos 1
      if (vagasLivresAtual == 0) vagasLivresAtual = 1;
      atualizaLedIndicador();            // <-- NOVO
      texto = "LIBERADO";
      destaque = true;
      Serial.println(">> Estacionamento LIBERADO");
  }

  if (texto.length() > 0) {
    Serial.print("Mensagem ESP-NOW: ");
    Serial.println(texto);

    if (destaque) desenhaMensagemDestaque(texto);
    else if (preferencial) desenhaMensagemPreferencial(texto);
    else desenhaMensagem(texto);

    unsigned long tempo = destaque ? duracaoMensagem * 2 : duracaoMensagem;
    unsigned long inicio = millis();
    while (millis() - inicio < tempo) delay(10);

    redesenhaEstadoAtual();

    unsigned long agoraReset = millis();
    ultimoPiscar = agoraReset;
    ultimoAlvo = agoraReset;
    ultimaExpressao = agoraReset;
    ultimoAtividade = agoraReset;
  }
}

// ======================================================
// SETUP
// ======================================================
void setup() {
  Serial.begin(115200);

  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    while (true);
  }

  servoEntrada.attach(PINO_SERVO_ENTRADA);
  servoSaida.attach(PINO_SERVO_SAIDA);
  servoEntrada.write(0);
  servoSaida.write(0);

  pinMode(TRIG_ENTRADA, OUTPUT);
  pinMode(ECHO_ENTRADA, INPUT);
  pinMode(TRIG_SAIDA, OUTPUT);
  pinMode(ECHO_SAIDA, INPUT);

  pinMode(LED_INDICADOR_VERDE, OUTPUT);
  pinMode(LED_INDICADOR_VERMELHO, OUTPUT);
  digitalWrite(LED_INDICADOR_VERDE, HIGH);
  digitalWrite(LED_INDICADOR_VERMELHO, LOW);

  atualizaLedIndicador();

  WiFi.mode(WIFI_STA);

  // NOVO - Parte 5: conecta no MESMO Wi-Fi do estacionamento para
  // manter o ESP-NOW no mesmo canal (ver explicacao no topo do arquivo)
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  if (esp_now_init() != ESP_OK) {
    Serial.println("Erro ao inicializar ESP-NOW");
    return;
  }
  esp_now_register_recv_cb(OnDataRecv);

  randomSeed(micros());
  escolherNovoAlvo();
  desenhaOlhos(offsetX, offsetY, 30);

  intervaloPiscada = random(2000, 6000);
  ultimoAtividade = millis();
  ultimaExpressao = millis();
  intervaloExpressao = random(3000, 7000);

  Serial.println("Robô + Cancela prontos.");
}

// ======================================================
// LOOP
// ======================================================
void loop() {
  processarMensagemESPNow();

  if (millis() - ultimaLeitura >= tempoEntreLeituras) {
    verificarCancelas();
    ultimaLeitura = millis();
  }

  unsigned long agora = millis();

  if (estadoAtual == NORMAL && agora - ultimoAtividade >= tempoParaDormir) {
    estadoAtual = DORMINDO;
    piscando = false;
    inicioSono = agora;
    ultimoSono = agora;
    etapaSono = 0;
    desenhaSono();
  }

  if (estadoAtual == NORMAL) {
    if (!piscando && chegouAoAlvo() && agora - ultimoAlvo >= tempoOlhando) {
      escolherNovoAlvo();
      ultimoAlvo = agora;
    }

    if (!piscando && agora - ultimoMovimento >= intervaloMovimento) {
      if (offsetX < alvoX) offsetX++;
      if (offsetX > alvoX) offsetX--;
      if (offsetY < alvoY) offsetY++;
      if (offsetY > alvoY) offsetY--;

      desenhaOlhos(offsetX, offsetY, 30);
      ultimoMovimento = agora;
    }

    if (!piscando && chegouAoAlvo() && agora - ultimoMicroMovimento >= intervaloMicroMovimento) {
      fazerMicroMovimento();
      ultimoMicroMovimento = agora;
      intervaloMicroMovimento = random(300, 800);
    }

    if (!piscando && agora - ultimoPiscar >= intervaloPiscada) {
      piscando = true;
      desenhaOlhos(offsetX, offsetY, 2);
      ultimoPiscar = agora;
    }

    if (piscando && agora - ultimoPiscar >= 150) {
      piscando = false;
      desenhaOlhos(offsetX, offsetY, 30);
      ultimoPiscar = agora;
      intervaloPiscada = random(2000, 6000);
    }

    if (!piscando && agora - ultimaExpressao >= intervaloExpressao) {
      int chance = random(0, 100);

      if (chance < 20) {
        estadoAtual = SURPRESO;
        inicioSurpresa = agora;
        tempoSurpreso = random(800, 1800);
        return;
      }

      if (chance < 40) {
        estadoAtual = FELIZ;
        inicioFeliz = agora;
        tempoFeliz = random(1200, 3000);
        return;
      }

      ultimaExpressao = agora;
      intervaloExpressao = random(3000, 7000);
    }
  }

  if (estadoAtual == SURPRESO) {
    desenhaSurpreso();

    if (agora - inicioSurpresa >= tempoSurpreso) {
      estadoAtual = NORMAL;
      ultimoPiscar = agora;
      intervaloPiscada = random(2000, 6000);
      ultimoAlvo = agora;
      escolherNovoAlvo();
      ultimaExpressao = agora;
      intervaloExpressao = random(3000, 7000);
      desenhaOlhos(offsetX, offsetY, 30);
    }
  }

  if (estadoAtual == FELIZ) {
    desenhaFeliz();

    if (agora - inicioFeliz >= tempoFeliz) {
      estadoAtual = NORMAL;
      ultimoPiscar = agora;
      intervaloPiscada = random(2000, 6000);
      ultimoAlvo = agora;
      escolherNovoAlvo();
      ultimaExpressao = agora;
      intervaloExpressao = random(3000, 7000);
      desenhaOlhos(offsetX, offsetY, 30);
    }
  }

  if (estadoAtual == DORMINDO) {
    if (agora - ultimoSono >= 800) {
      etapaSono++;
      if (etapaSono > 2) etapaSono = 0;
      desenhaSono();
      ultimoSono = agora;
    }

    if (agora - inicioSono >= tempoDormindo) {
      estadoAtual = ACORDANDO;
      etapaAcordando = 0;
      ultimoAcordando = agora;
      desenhaAcordando();
    }
  }

  if (estadoAtual == ACORDANDO) {
    if (agora - ultimoAcordando >= 300) {
      etapaAcordando++;

      if (etapaAcordando > 3) {
        etapaAcordando = 3;
        estadoAtual = NORMAL;
        ultimoAtividade = agora;
        ultimoAlvo = agora;
        ultimaExpressao = agora;
        escolherNovoAlvo();
        intervaloExpressao = random(3000, 7000);
      }

      desenhaAcordando();
      ultimoAcordando = agora;
    }
  }
}