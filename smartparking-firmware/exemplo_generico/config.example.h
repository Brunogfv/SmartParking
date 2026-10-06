#pragma once
// ============================================================
// TEMPLATE de configuracao local (pode ser versionado no Git)
//
// COMO USAR:
// 1. Copie este arquivo para "config.h" (na mesma pasta)
// 2. Preencha com seus dados reais
// 3. O "config.h" e ignorado pelo Git (contem credenciais)
// ============================================================

const char* WIFI_SSID = "SEU_SSID";
const char* WIFI_PASSWORD = "SUA_SENHA";

const char* SERVER_URL = "http://IP_DO_NOTEBOOK:3000/api/vagas";

const uint8_t MAC_ROBO_CANCELA[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00};