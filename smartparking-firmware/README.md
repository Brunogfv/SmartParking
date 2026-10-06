# SmartParking - Firmware ESP32

Firmwares do projeto SmartParking, com **Wi-Fi + HTTP POST** integrados ao **ESP-NOW** (robo e cancela continuam funcionando em paralelo).

## Estrutura

| Pasta | Placa | Funcao |
|---|---|---|
| `estacionamento/` | ESP32 do estacionamento | Le 3 sensores HC-SR04, controla LEDs, envia ESP-NOW + HTTP POST |
| `robo_cancela/` | ESP32 do robo + cancela | Recebe ESP-NOW, mostra no OLED, controla 2 servos e 2 sensores de cancela |
| `exemplo_generico/` | (referencia) | Firmware de exemplo comentado, caso queira comparar abordagens |

Cada pasta e um sketch independente do Arduino IDE.

## Configuracao (OBRIGATORIA antes de compilar)

As credenciais NAO ficam no codigo (e nao vao para o Git). Para cada pasta:

1. Copie `config.example.h` para `config.h`
2. Preencha:
   - `WIFI_SSID` / `WIFI_PASSWORD`: rede que o ESP32 vai usar
   - `SERVER_URL`: `http://IP_DO_NOTEBOOK:3000/api/vagas` (o log do servidor Node.js mostra os IPs da LAN)
   - `macRobo` / `macCancela` (so no estacionamento): MACs obtidos no monitor serial do receptor

> O `config.h` esta no `.gitignore` - nunca e publicado.

## Como funciona

- O estacionamento le as 3 vagas com filtro de estabilidade (2 confirmacoes)
- Quando uma vaga muda de estado, envia por **dois caminhos**:
  - **ESP-NOW** -> robo + cancela
  - **HTTP POST** -> servidor Node.js, com `distanciaCm` (leitura real do HC-SR04) e `macAddress`
- `MSG_STATUS` (vagas livres) e enviado a cada ciclo; `LOTADO`/`LIBERADO` so na transicao
- Se o Wi-Fi cair: ESP-NOW continua, o HTTP loga a falha e reconecta a cada 5s (via `millis()`, sem `delay()` longo)
- Ao reconectar, sincroniza o estado atual das 3 vagas com o servidor

### Formato do POST

```json
{
  "vaga": "A01",
  "ocupada": true,
  "preferencial": false,
  "distanciaCm": 5.2,
  "macAddress": "XX:XX:XX:XX:XX:XX"
}
```

## Gravacao (Arduino IDE)

1. **File > Preferences > Additional Boards Manager URLs**:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. Bibliotecas necessarias (Library Manager):
   - `Adafruit GFX Library`
   - `Adafruit SSD1306`
   - `ESP32Servo`
3. **Tools > Board > ESP32 Dev Module** e selecione a porta USB
4. Abra a pasta do sketch (ex: `estacionamento/`) e clique em **Upload**
5. **Serial Monitor** em **115200**

## ⚠️ Canal do ESP-NOW

O ESP-NOW funciona no canal do Wi-Fi. Quando o estacionamento conecta no
roteador, o robo/cancela precisa estar na **mesma rede** (e canal), por isso
o `robo_cancela` tambem executa `WiFi.begin(...)` no setup com as mesmas
credenciais do `config.h`.

## Log esperado (estacionamento)

```
================================
  SMARTPARKING - 3 VAGAS
  Wi-Fi + ESP-NOW
================================
>> Wi-Fi: tentando conectar...
>> Wi-Fi conectado! IP: 192.168.0.10
A01: 24.5 cm -> LIVRE
A01: 5.2 cm -> OCUPADA
>> POST {"vaga":"A01","ocupada":true,...}
>> POST OK: A01 OCUPADA (5.2 cm)
>> Enviado STATUS: 2 vagas livres
```

## Diagnosticos

| Problema | Causa provavel | Solucao |
|---|---|---|
| `Wi-Fi: tentando conectar...` eterno | SSID/senha errados ou fora de alcance | Confira o `config.h` e a distancia do roteador |
| `POST FALHOU (connection refused)` | Notebook em outra rede ou servidor parado | Mesma rede + `npm run dev` no servidor |
| `POST respondeu HTTP 404` | URL errada | Confira `SERVER_URL` (precisa de `/api/vagas`) |
| Robo parou de receber ESP-NOW | Canal diferente | Robo precisa estar na mesma rede do estacionamento |
| ESP-NOW funciona, HTTP nao | Wi-Fi caiu | Reconecta sozinho em 5s; ESP-NOW segue ativo |
