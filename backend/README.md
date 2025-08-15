# RepCellPOS API

Backend API en Node.js + Express + MongoDB para el sistema de punto de venta de talleres de reparación.

## Características

- Autenticación con JWT (registro, login, `GET /api/auth/me`).
- Roles: `technician`, `admin` con middleware `authorize()`.
- CRUD de clientes, equipos, inventario y facturas.
- Reparaciones: historial de cambios de estado con comentarios.
- Facturación: crea factura, ajusta stock (si los items referencian productos) y genera PDF.
- Dashboard: resumen de reparaciones activas, ingresos recientes y stock bajo.
- Validación con `express-validator`, seguridad con `helmet`, logs con `morgan` y compresión.

## Requisitos

- Node.js 18+
- MongoDB 5+

## Configuración

1) Clonar/abrir el proyecto y crear `.env` basado en `.env.example`.

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/repcellpos
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

2) Instalar dependencias e iniciar en desarrollo:

```bash
npm install
npm run dev
```

El API quedará en `http://localhost:4000`.

## Estructura

```
src/
  app.js            # configuración de Express
  server.js         # arranque del servidor
  config/db.js      # conexión a MongoDB
  models/           # modelos Mongoose (User, Client, Device, Repair, Product, Invoice)
  controllers/      # lógica de negocio por entidad
  routes/           # rutas por entidad (auth, clients, devices, repairs, inventory, invoices, dashboard)
  middlewares/      # middlewares (auth, validate, errorHandler, notFound)
```

## Endpoints principales

- Auth
  - POST `/api/auth/register` { name, email, password }
  - POST `/api/auth/login` { email, password }
  - GET `/api/auth/me` Bearer <token>

- Clientes
  - GET `/api/clients`
  - POST `/api/clients` { name, phone, email? }
  - GET `/api/clients/:id`
  - PUT `/api/clients/:id`
  - DELETE `/api/clients/:id`

- Equipos
  - GET `/api/devices?status=&client=`
  - POST `/api/devices` { client, brand, model, issue, status? }
  - GET `/api/devices/:id`  // incluye `history`
  - PUT `/api/devices/:id`
  - DELETE `/api/devices/:id`

- Reparaciones (historial)
  - GET `/api/repairs?deviceId=`
  - POST `/api/repairs` { device, status, comment? }  // actualiza estado de equipo y crea registro
  - Estados válidos: `diagnóstico`, `en reparación`, `listo`, `entregado`

- Inventario
  - GET `/api/inventory`
  - POST `/api/inventory` { name, quantity, price, supplier?, minStock? }  // admin
  - GET `/api/inventory/:id`
  - PUT `/api/inventory/:id` // admin
  - DELETE `/api/inventory/:id` // admin
  - POST `/api/inventory/adjust` { items: [{productId, quantityUsed}] } // admin|technician

- Facturas
  - GET `/api/invoices`
  - POST `/api/invoices` { client, device?, items:[{description, quantity, unitPrice, product?}], notes? }
  - GET `/api/invoices/:id`
  - DELETE `/api/invoices/:id` // admin
  - GET `/api/invoices/:id/pdf` // genera PDF con pdfkit

- Dashboard
  - GET `/api/dashboard` // { activeRepairs, incomeLast30Days, recentInvoices, lowInventory }

## Notas de integración con el frontend Next.js

- Autenticación: enviar `Authorization: Bearer <token>` en cada request tras login.
- CORS: establece `CORS_ORIGIN` para incluir el origen del frontend (p. ej. `http://localhost:3001`).
- Estados de equipos: este backend usa `diagnóstico | en reparación | listo | entregado`. Si tu UI usa otros, mapea los valores.
- Para disminuir el stock automáticamente, al crear factura incluye `product` en cada item (ObjectId del producto).

## Licencia
MIT
