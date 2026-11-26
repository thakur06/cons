-- PostgreSQL Database Schema for File Manager with S3 & RBAC

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (quoted because "user" is a reserved keyword in PostgreSQL)
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Files Table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    is_local BOOLEAN DEFAULT FALSE,
    uploaded_by UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Packages Table (Skids in a project)
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    skid_type VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Requirements Table (Components / Operations in a Skid)
CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    characteristics TEXT,
    check_requirement TEXT,
    quantum_check TEXT,
    ref_document TEXT,
    acceptance_standard TEXT,
    format_of_record TEXT,
    inspection_p VARCHAR(20),
    inspection_w VARCHAR(20),
    inspection_r VARCHAR(20),
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Requirement Files Table
CREATE TABLE IF NOT EXISTS requirement_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    is_local BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    uploaded_by UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    uploader_name VARCHAR(100),
    share_link_id UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Roles
INSERT INTO roles (id, name, description)
VALUES 
    (1, 'Admin', 'Full control: Upload, View, Download, Delete all files, and Manage user roles'),
    (2, 'Manager', 'Manage files: Upload, View, Download all files, Delete own files'),
    (3, 'User', 'Standard user: Upload, View, Download, and Delete own files')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- One-Time Share Upload Links Table
CREATE TABLE IF NOT EXISTS share_upload_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(64) UNIQUE NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    otp_display VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(100),
    recipient_email VARCHAR(255),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    failed_attempts INT DEFAULT 0,
    used_at TIMESTAMPTZ,
    uploaded_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    uploaded_file_name VARCHAR(255),
    uploader_name VARCHAR(100),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
    requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
    component_name VARCHAR(255),
    skid_name VARCHAR(255),
    project_name VARCHAR(255),
    format_of_record VARCHAR(255),
    allow_multiple BOOLEAN DEFAULT TRUE,
    uploaded_files JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Migrations for existing deployments
ALTER TABLE packages ADD COLUMN IF NOT EXISTS skid_type VARCHAR(100) DEFAULT 'general';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS characteristics TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS check_requirement TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS quantum_check TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS ref_document TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS acceptance_standard TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS format_of_record TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS inspection_p VARCHAR(20);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS inspection_w VARCHAR(20);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS inspection_r VARCHAR(20);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS remark TEXT;

ALTER TABLE requirement_files ADD COLUMN IF NOT EXISTS uploader_name VARCHAR(100);
ALTER TABLE requirement_files ADD COLUMN IF NOT EXISTS share_link_id UUID;

ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS package_id UUID;
ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS requirement_id UUID;
ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS component_name VARCHAR(255);
ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS skid_name VARCHAR(255);
ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS format_of_record VARCHAR(255);
ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN DEFAULT TRUE;
ALTER TABLE share_upload_links ADD COLUMN IF NOT EXISTS uploaded_files JSONB DEFAULT '[]';

-- Sort order for drag-and-drop PDF export ordering
ALTER TABLE packages      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE requirements  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
