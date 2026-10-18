-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  avatar_url text,
  created_at timestamp with time zone NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.caches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location_name text,
  difficulty smallint NOT NULL DEFAULT '1'::smallint CHECK (difficulty >= 1 AND difficulty <= 5),
  image text,
  is_active boolean NOT NULL DEFAULT true,
  secret_code text NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  CONSTRAINT caches_pkey PRIMARY KEY (id),
  CONSTRAINT caches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.hints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  cache_id uuid NOT NULL,
  hint_order smallint NOT NULL CHECK (hint_order >= 1 AND hint_order <= 3),
  hint_text text NOT NULL,
  is_ai_generated boolean NOT NULL DEFAULT false,
  CONSTRAINT hints_pkey PRIMARY KEY (id),
  CONSTRAINT hints_cache_id_fkey FOREIGN KEY (cache_id) REFERENCES public.caches(id)
);
CREATE TABLE public.finds (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  cache_id uuid NOT NULL,
  finder_id uuid NOT NULL,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  journal_note text,
  photo text,
  CONSTRAINT finds_pkey PRIMARY KEY (id),
  CONSTRAINT finds_cache_id_fkey FOREIGN KEY (cache_id) REFERENCES public.caches(id),
  CONSTRAINT finds_finder_id_fkey FOREIGN KEY (finder_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  cache_id uuid,
  content text NOT NULL,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id),
  CONSTRAINT messages_cache_id_fkey FOREIGN KEY (cache_id) REFERENCES public.caches(id)
);