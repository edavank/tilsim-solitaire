#!/usr/bin/env python3
"""
Apple Client Secret JWT üretici
Kullanım: python3 scripts/apple-secret.py

Supabase Apple provider'ın Secret Key alanına yapıştırılacak JWT üretir.
6 ayda bir yenilenmesi gerekir (Apple kuralı).

Gerekli: pip install pyjwt cryptography
"""

import jwt
import time
import sys
import os

TEAM_ID = "3DMPKBVNZ8"
KEY_ID = "AAXGWH9S22"
SERVICE_ID = "com.edavank.tilsimsolitaire.auth"
KEY_FILE = os.path.join(os.path.dirname(__file__), "..", "AuthKey_AAXGWH9S22.p8")

if not os.path.exists(KEY_FILE):
    print(f"❌ {KEY_FILE} bulunamadı")
    print("   .p8 dosyasını proje root'una koy")
    sys.exit(1)

with open(KEY_FILE, "r") as f:
    private_key = f.read()

now = int(time.time())
payload = {
    "iss": TEAM_ID,
    "iat": now,
    "exp": now + (86400 * 180),  # 180 gün
    "aud": "https://appleid.apple.com",
    "sub": SERVICE_ID,
}

token = jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": KEY_ID})

print("\n✅ Apple Client Secret JWT (180 gün geçerli):\n")
print(token)
print("\n→ Supabase → Authentication → Providers → Apple → Secret Key alanına yapıştır")
print(f"→ Süre dolumu: {time.strftime('%d %B %Y', time.localtime(now + 86400 * 180))}\n")
