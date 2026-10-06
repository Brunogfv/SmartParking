#pragma once
// ============================================================
// TEMPLATE de configuracao local (pode ser versionado no Git)
//
// COMO USAR:
// 1. Copie este arquivo para "config.h" (na mesma pasta)
// 2. Preencha com seus dados reais
// 3. O "config.h" e ignorado pelo Git (contem credenciais)
// ============================================================

// Rede Wi-Fi (ESP32 e notebook precisam estar na mesma rede)
const char* WIFI_SSID = "SEU_SSID";
const char* WIFI_PASSWORD = "SUA_SENHA";

// IP do notebook na rede local (ex: http://192.168.0.100:3000/api/vagas)
const char* SERVER_URL = "http://IP_DO_NOTEBOOK:3000/api/vagas";

// MACs dos receptores ESP-NOW (descubra com WiFi.macAddress() no receptor)
uint8_t macRobo[]    = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
uint8_t macCancela[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00};