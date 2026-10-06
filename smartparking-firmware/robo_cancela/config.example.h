#pragma once
// ============================================================
// TEMPLATE de configuracao local (pode ser versionado no Git)
//
// COMO USAR:
// 1. Copie este arquivo para "config.h" (na mesma pasta)
// 2. Preencha com seus dados reais
// 3. O "config.h" e ignorado pelo Git (contem credenciais)
// ============================================================

// O robo/cancela se conecta no MESMO Wi-Fi do estacionamento
// para manter o ESP-NOW no mesmo canal.
const char* WIFI_SSID = "SEU_SSID";
const char* WIFI_PASSWORD = "SUA_SENHA";