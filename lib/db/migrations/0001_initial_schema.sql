-- =============================================================
-- Migration: 0001_initial_schema.sql
-- Project:   Fluir da Vida — Fase 2
-- Descrição: Criação completa do modelo de dados aprovado.
--            14 tabelas, índices, constraints, EXCLUDE e triggers.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSION
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─────────────────────────────────────────────────────────────
-- TRIGGER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- A: Auto-atualiza updated_at em qualquer UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B: Bloqueia UPDATE e DELETE em tabelas append-only
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'Table % is append-only and cannot be modified or deleted',
    TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- C: Garante imutabilidade de price_at_booking após criação
CREATE OR REPLACE FUNCTION prevent_price_at_booking_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.price_at_booking <> OLD.price_at_booking THEN
    RAISE EXCEPTION
      'appointments.price_at_booking is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 1. roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id   smallint    PRIMARY KEY,
  name varchar(20) NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 2. users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       smallint     NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  name          varchar(255) NOT NULL,
  email         varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  phone         varchar(20),
  status        varchar(10)  NOT NULL DEFAULT 'ACTIVE',
  last_login_at timestamptz,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- Email case-insensitive: índice único funcional em lower(email)
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
  ON users (lower(email));

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_status  ON users (status);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. clients
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  birth_date date,
  notes      text,
  status     varchar(10) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_clients_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. professionals
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professionals (
  id        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid         NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  specialty varchar(255),
  bio       text,
  status    varchar(10)  NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_professionals_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TRIGGER trg_professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. addresses  (UNIQUE client_id — MVP: 1 endereço por cliente)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid         NOT NULL UNIQUE REFERENCES clients(id) ON DELETE RESTRICT,
  street       varchar(255) NOT NULL,
  number       varchar(20)  NOT NULL,
  complement   varchar(100),
  neighborhood varchar(100) NOT NULL,
  city         varchar(100) NOT NULL,
  state        char(2)      NOT NULL,
  postal_code  varchar(10)  NOT NULL,
  reference    varchar(255),
  latitude     numeric(10,7),
  longitude    numeric(10,7),
  is_default   boolean      NOT NULL DEFAULT false,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 6. services
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name               varchar(255)  NOT NULL,
  description        text,
  duration_minutes   integer       NOT NULL,
  price              numeric(10,2) NOT NULL,
  allowed_modalities varchar(10)   NOT NULL DEFAULT 'BOTH',
  status             varchar(10)   NOT NULL DEFAULT 'ACTIVE',
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT chk_services_duration   CHECK (duration_minutes > 0),
  CONSTRAINT chk_services_price      CHECK (price >= 0),
  CONSTRAINT chk_services_modalities CHECK (allowed_modalities IN ('IN_PERSON', 'HOME_CARE', 'BOTH')),
  CONSTRAINT chk_services_status     CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 7. professional_services
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_services (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid        NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  service_id      uuid        NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_professional_services UNIQUE (professional_id, service_id)
);

-- ─────────────────────────────────────────────────────────────
-- 8. availability
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid        NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  weekday         smallint    NOT NULL,
  start_time      time        NOT NULL,
  end_time        time        NOT NULL,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_availability_weekday CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT chk_availability_time    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_prof_weekday
  ON availability (professional_id, weekday);

CREATE TRIGGER trg_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 9. blocked_periods
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_periods (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid        NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  start_datetime  timestamptz NOT NULL,
  end_datetime    timestamptz NOT NULL,
  reason          text,
  status          varchar(10) NOT NULL DEFAULT 'ACTIVE',
  created_by      uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_blocked_periods_dates  CHECK (end_datetime > start_datetime),
  CONSTRAINT chk_blocked_periods_status CHECK (status IN ('ACTIVE', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_blocked_prof_time
  ON blocked_periods (professional_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_blocked_status
  ON blocked_periods (status);

CREATE TRIGGER trg_blocked_periods_updated_at
  BEFORE UPDATE ON blocked_periods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 10. resources
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(100) NOT NULL UNIQUE,
  type       varchar(20)  NOT NULL DEFAULT 'MASSAGE_TABLE',
  status     varchar(10)  NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT chk_resources_type   CHECK (type IN ('MASSAGE_TABLE', 'ROOM', 'EQUIPMENT', 'OTHER')),
  CONSTRAINT chk_resources_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 11. appointments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid          NOT NULL REFERENCES clients(id)      ON DELETE RESTRICT,
  professional_id  uuid          NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  service_id       uuid          NOT NULL REFERENCES services(id)      ON DELETE RESTRICT,
  modality         varchar(10)   NOT NULL,
  resource_id      uuid          REFERENCES resources(id)  ON DELETE RESTRICT,
  address_id       uuid          REFERENCES addresses(id)  ON DELETE RESTRICT,
  start_datetime   timestamptz   NOT NULL,
  end_datetime     timestamptz   NOT NULL,
  status           varchar(15)   NOT NULL DEFAULT 'CONFIRMED',
  price_at_booking numeric(10,2) NOT NULL,
  notes            text,
  created_by       uuid          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT chk_appt_dates    CHECK (end_datetime > start_datetime),
  CONSTRAINT chk_appt_price    CHECK (price_at_booking >= 0),
  CONSTRAINT chk_appt_status   CHECK (status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  CONSTRAINT chk_appt_modality CHECK (modality IN ('IN_PERSON', 'HOME_CARE')),
  -- Integridade de modalidade: HOME_CARE exige address, IN_PERSON exige resource
  CONSTRAINT chk_appt_modality_refs CHECK (
    (modality = 'HOME_CARE' AND resource_id IS NULL     AND address_id IS NOT NULL) OR
    (modality = 'IN_PERSON' AND resource_id IS NOT NULL AND address_id IS NULL)
  )
);

-- Índices de performance de appointments
CREATE INDEX IF NOT EXISTS idx_appt_professional_time
  ON appointments (professional_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_appt_resource_time
  ON appointments (resource_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_appt_client_id
  ON appointments (client_id);
CREATE INDEX IF NOT EXISTS idx_appt_start_datetime
  ON appointments (start_datetime);
CREATE INDEX IF NOT EXISTS idx_appt_professional_status
  ON appointments (professional_id, status, start_datetime);
CREATE INDEX IF NOT EXISTS idx_appt_status
  ON appointments (status);

-- EXCLUDE constraints (btree_gist) — 3 camadas de proteção contra sobreposição
ALTER TABLE appointments ADD CONSTRAINT excl_professional_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(start_datetime, end_datetime) WITH &&
  ) WHERE (status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW'));

ALTER TABLE appointments ADD CONSTRAINT excl_resource_no_overlap
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_datetime, end_datetime) WITH &&
  ) WHERE (status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')
           AND resource_id IS NOT NULL);

ALTER TABLE appointments ADD CONSTRAINT excl_client_no_overlap
  EXCLUDE USING gist (
    client_id WITH =,
    tstzrange(start_datetime, end_datetime) WITH &&
  ) WHERE (status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW'));

-- Trigger: auto-atualiza updated_at
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: price_at_booking é imutável após criação
CREATE TRIGGER trg_appt_price_immutable
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION prevent_price_at_booking_change();

-- ─────────────────────────────────────────────────────────────
-- 12. appointment_status_history  (append-only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_status_history (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     uuid        NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  old_status         varchar(15),
  new_status         varchar(15) NOT NULL,
  changed_by         uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason             text,
  -- Campos de rastreamento de remarcação (NULL quando não é remarcação)
  old_start_datetime timestamptz,
  old_end_datetime   timestamptz,
  new_start_datetime timestamptz,
  new_end_datetime   timestamptz,
  old_resource_id    uuid,
  new_resource_id    uuid,
  old_address_id     uuid,
  new_address_id     uuid,
  changed_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_history_appt_id
  ON appointment_status_history (appointment_id);

-- Triggers append-only: bloqueiam UPDATE e DELETE
CREATE TRIGGER trg_appt_history_no_update
  BEFORE UPDATE ON appointment_status_history
  FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trg_appt_history_no_delete
  BEFORE DELETE ON appointment_status_history
  FOR EACH ROW EXECUTE FUNCTION prevent_modification();

-- ─────────────────────────────────────────────────────────────
-- 13. notifications
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid         NOT NULL REFERENCES users(id)        ON DELETE RESTRICT,
  type           varchar(50)  NOT NULL,
  title          varchar(255) NOT NULL,
  message        text         NOT NULL,
  appointment_id uuid         REFERENCES appointments(id) ON DELETE RESTRICT,
  read_at        timestamptz,
  created_at     timestamptz  NOT NULL DEFAULT now()
);

-- Índice parcial: não-lidas (consulta mais frequente)
CREATE INDEX IF NOT EXISTS idx_notif_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notif_user_all
  ON notifications (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 14. audit_logs  (append-only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action      varchar(50) NOT NULL,
  entity_type varchar(50) NOT NULL,
  entity_id   uuid        NOT NULL,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id
  ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at
  ON audit_logs (created_at DESC);

-- Triggers append-only: bloqueiam UPDATE e DELETE
CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_modification();
