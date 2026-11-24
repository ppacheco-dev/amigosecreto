# 🎄 Amigo Secreto Familiar (Presupuesto $20.000)

Aplicación web minimalista con **enlaces privados por WhatsApp**, lista para subir gratis a **Vercel**:

- **Sin spoilers para el organizador:** Agregas a los participantes, defines restricciones, sorteas y envías los enlaces individuales por WhatsApp sin ver nunca quién le tocó a quién.
- **Un único link secreto por persona:** Sin contraseñas ni cuentas.
- **Revelación festiva con confeti:** Caja de regalo interactiva y modo anti-espías para ocultar la pantalla.
- **Restricciones flexibles:** Reglas de una dirección (`A no saca a B`) o mutuas (`parejas / matrimonios`), con validación en tiempo real.
- **Lista de deseos opcional y con guardado automático:** Cada persona puede anotar ideas de regalo y tallas/preferencias en su mismo enlace después del sorteo.

---

## 💻 Probar en tu computador

```bash
npm install
npm run dev
```

Abre [http://localhost:3000/admin](http://localhost:3000/admin) para crear tu clave, cargar a los 8 familiares, poner restricciones, sortear y obtener los enlaces privados.

> En modo local los datos se guardan automáticamente en la carpeta `.data/` (sin configurar nada extra).

---

## 🚀 Cómo subirlo gratis a Vercel (en 3 minutos)

1. Sube esta carpeta a un repositorio en **GitHub** (puede ser privado).
2. Entra a [vercel.com](https://vercel.com) → **Add New Project** → importa tu repositorio y haz clic en **Deploy**.
3. Para que los datos se guarden en la nube (plan **100% gratuito**):
   - Dentro de tu proyecto en Vercel, ve a la pestaña **Storage** → **Create Database** → elige **Upstash** (**Upstash for Redis**, plan Free).
   - Conéctalo a tu proyecto (Vercel agregará automáticamente las variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`).
   - Ve a **Deployments** y haz **Redeploy** del último despliegue.
4. ¡Listo! Verás la insignia verde **☁️ Nube (Redis)** en tu `/admin`.
