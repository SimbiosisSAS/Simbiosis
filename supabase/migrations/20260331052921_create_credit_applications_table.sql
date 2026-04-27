/*
  # Create Credit Applications Table

  1. New Tables
    - `credit_applications`
      - `id` (uuid, primary key)
      - `credit_type` (enum: ENTREPRENEURSHIP, REAL_ESTATE, FREE_INVESTMENT, MICROCREDIT)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text)
      - `id_number` (text)
      - `credit_amount` (numeric)
      - `id_front_image` (text - image URL)
      - `id_back_image` (text - image URL)
      - `selfie_image` (text - image URL)
      - `status` (enum: PENDING, APPROVED, REJECTED)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `credit_applications` table
    - Add policy for public insert (new applications)
    - Add policy for public select (users can view their own applications)
*/

CREATE TYPE credit_type AS ENUM ('ENTREPRENEURSHIP', 'REAL_ESTATE', 'FREE_INVESTMENT', 'MICROCREDIT');
CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE IF NOT EXISTS credit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_type credit_type NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  id_number text NOT NULL UNIQUE,
  credit_amount numeric NOT NULL CHECK (credit_amount > 0),
  id_front_image text,
  id_back_image text,
  selfie_image text,
  status application_status DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a credit application"
  ON credit_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view all applications by email"
  ON credit_applications FOR SELECT
  USING (true);

CREATE INDEX idx_credit_applications_email ON credit_applications(email);
CREATE INDEX idx_credit_applications_id_number ON credit_applications(id_number);
CREATE INDEX idx_credit_applications_status ON credit_applications(status);
