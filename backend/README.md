# Backend Info

Server Host: Vercel (Vercel project, not proxy).

Postgres Database: Neon & Localhost. Uses `postgres.js`.

Redis Database: Upstash & Localhost. Uses `ioredis`.

Free-tier plan of the proviers are used.

## Constraints

Confirmed constraints.

Vercel:
- 4.5 MB request and response body.

Neon:
- 1 GB storage.

Upstash:
- 256 MB storage.

## Database schema

```sql
create table users(
  id uuid primary key default uuidv7(),
  username text not null unique,
  password_hash text not null,
  password_salt text not null,
  display_name text,
  token_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_avatars(
  user_id uuid primary key references users(id) on delete cascade,
  data bytea not null,
  type text not null,
  hash text not null,
  updated_at timestamptz not null default now()
);

create table user_sessions(
  id uuid primary key default uuidv7(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  token_version integer not null,
  ip_address text not null,
  geo_location text not null,
  device_name text not null,
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz,
  last_used_at timestamptz not null default now()
);

create unique index on user_sessions (token_hash);
create index on user_sessions (user_id);

create table projects(
  id uuid primary key default uuidv7(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  icon text,
  color_hue double precision not null default 270.0,
  tags text[] not null default '{}',
  timeline jsonb not null default '[]'::jsonb,
  position double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on projects (user_id);

create table tasks(
  id uuid primary key default uuidv7(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'pending',
  priority text not null default 'medium',
  expected_days_min integer,
  expected_days_max integer,
  position double precision not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on tasks (project_id);

create table task_subtasks(
  task_id uuid primary key references tasks(id) on delete cascade,
  sub_tasks jsonb not null
);

create table notes(
  id uuid primary key default uuidv7(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text not null,
  icon text not null default 'file',
  color_hue double precision not null default 270.0,
  pinned boolean not null default false,
  position double precision not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on notes (project_id);

create table note_bodies(
  note_id uuid primary key references notes(id) on delete cascade,
  body text not null
);

create table attachments(
  id uuid primary key default uuidv7(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text not null,
  type text not null,
  hash text not null,
  size integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on attachments (project_id);

create table attachment_data(
  attachment_id uuid primary key references attachments(id) on delete cascade,
  data bytea not null
);
```

## JSON & Type schema

```ts
type Completion = "pending" | "completed" | "abandoned";

type AttachmentType = "png" | "jpeg" | "gif" | "webp" | "jpegxl";

type Icon = "<64 possible icons>"; // See icons.md

type Timeline = {
  status: "start" | "pause" | "resume" | "complete" | "abandon";
  at: Date;
}[]; // JSON Blob in schema

type Subtasks = {
  status: Completion;
  label: string;
  weight: number; // Default 1
  subtasks: Subtasks; // Max depth 3 levels
}[]; // JSON Blob in schema
```

## API Plan

| Method   | Endpoint                    | Description                          | Request Body                                 | Response Body                     |
| -------- | --------------------------- | ------------------------------------ | -------------------------------------------- | --------------------------------- |
| `POST`   | `/login`                    | new session                          | username, password, device name in json body | token                             |
| `POST`   | `/logout`                   | logout session                       | -                                            | -                                 |
| `POST`   | `/logout-all`               | logout all sessions                  | -                                            | -                                 |
| `PUT`    | `/password`                 | change password                      | old password, new password                   | new token                         |
| `POST`   | `/refresh`                  | get new token                        | -                                            | new token                         |
| `GET`    | `/health`                   | server response check -              | -                                            | -                                 |
| `GET`    | `/sessions`                 | get all sessions                     | -                                            | sessions list                     |
| `DELETE` | `/sessions/:id`             | delete session                       | -                                            | -                                 |
| `GET`    | `/me`                       | get user info                        | -                                            | user info                         |
| `PATCH`  | `/me`                       | update user info                     | -                                            | user info                         |
| `GET`    | `/me/avatar`                | get avatar                           | -                                            | avatar info, avatar data          |
| `PUT`    | `/me/avatar`                | replace avatar                       | -                                            | avatar info                       |
| `DELETE` | `/me/avatar`                | delete avatar                        | -                                            | -                                 |
| `GET`    | `/projects`                 | get all projects                     | -                                            | projects list, counts per project |
| `POST`   | `/projects`                 | create project                       | project details                              | project info                      |
| `GET`    | `/projects/:id`             | get all tasks, notes and attachments | -                                            | tasks, notes and attachments list |
| `PATCH`  | `/projects/:id`             | update project                       | project details patch                        | project info                      |
| `DELETE` | `/projects/:id`             | delete project                       | -                                            | -                                 |
| `GET`    | `/search?query=query`       | search with terms                    | -                                            | project, task & note matches      |
| `POST`   | `/projects/:id/tasks`       | create task                          | task details                                 | task info                         |
| `GET`    | `/tasks/:id/subtasks`       | get subtasks                         | -                                            | subtasks data                     |
| `PATCH`  | `/tasks/:id`                | update task                          | task details patch, version                  | task info                         |
| `DELETE` | `/tasks/:id`                | delete task                          | -                                            | -                                 |
| `POST`   | `/projects/:id/notes`       | create note                          | note details                                 | note info                         |
| `GET`    | `/notes/:id/body`           | get note body                        | -                                            | note body data                    |
| `PATCH`  | `/notes/:id`                | update note                          | note details patch, version                  | note info                         |
| `DELETE` | `/notes/:id`                | delete note                          | -                                            | -                                 |
| `GET`    | `/attachments/:id`          | get attachment data                  | -                                            | attachment data                   |
| `POST`   | `/projects/:id/attachments` | create attachment                    | attachment data                              | attachment info                   |
| `PATCH`  | `/attachments/:id`          | update attachment details            | attachment details patch                     | attachment info                   |
| `PUT`    | `/attachments/:id`          | replace attachment                   | attachment data                              | attachment info                   |
| `DELETE` | `/attachments/:id`          | delete attachment                    | -                                            | -                                 |

## Server Details

- Server is stateless.
- User account creation & Deletion is done by admins only, using direct connection to the database.
- Every endpoint except `/login` and `/health` requires `Authorization: bearer <token hex>` header.
- Data validation and constraints are performed server-side.
- Call to Logout-all and password bumps user's token version.
- Out-of-date sessions in the server is cleared on every `/refresh` and just before every successful `/login`.
- `last_used_at` updated only on `GET /me`.
- Password hash derived with `scrypt` directly.
- `DELETE /sessions/:id` row-deletes session.
- `revoked_at` is for admin-use.
- All hash except password hash uses `SHA256`.

## Limits

- `/login` is rate-limited 3 calls/15 minutes using Redis per IP and per username.
- `/health` is rate-limited 60 calls/minute using Redis per IP.
- 4 MB per attachment.
- 512 KB per avatar.
- 256k characters per note body.
- 64 attachments per project.
- 1024 notes per project.
- 1024 tasks per project.
- 128 subtask nodes per task.
- 16 tags per project.
- 32 characters per tag.
- 256 timeline entries per project.
- 128 projects per user.
- 8 sessions per user.
- 256 characters per titles.
- 4096 characters per descriptions.
- 4-32 characters per username (charset: `[a-z0-9_.-]`).
- 8-64 characters per password.
- 4-32 characters per display name.
- 32 MB per user, sum of attachments, note bodies, task subtasks and avatar.
