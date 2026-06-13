CREATE DATABASE IF NOT EXISTS uzalendo_chama
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE uzalendo_chama;

-- --------------------------------------------------------
-- Table: chamas
-- One record only for Uzalendo Chama Investment Group.
-- chama_id exists on all tables to support future upgrade.
-- --------------------------------------------------------
CREATE TABLE chamas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table: admins
-- One admin only. Role is Treasurer.
-- --------------------------------------------------------
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chama_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chama_id) REFERENCES chamas(id)
);

-- --------------------------------------------------------
-- Table: members
-- Members register themselves. Status starts as PENDING.
-- Admin activates them (ACTIVE) before they can use the app.
-- loan_limit starts at 0 and is updated as member builds history.
-- --------------------------------------------------------
CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chama_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    national_id VARCHAR(20) NOT NULL UNIQUE,
    member_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('PENDING','ACTIVE','INACTIVE') DEFAULT 'PENDING',
    loan_limit DECIMAL(12,2) DEFAULT 0.00,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chama_id) REFERENCES chamas(id)
);

-- --------------------------------------------------------
-- Table: member_scores
-- Each member has exactly one score record.
-- Starts at 50. Updated on every contribution or repayment event.
-- Loan eligibility requires overall_score > 60.
-- --------------------------------------------------------
CREATE TABLE member_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL UNIQUE,
    contribution_score DECIMAL(5,2) DEFAULT 50.00,
    loan_score DECIMAL(5,2) DEFAULT 50.00,
    overall_score DECIMAL(5,2) DEFAULT 50.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- --------------------------------------------------------
-- Table: contributions
-- Admin records monthly contributions per member.
-- One record per member per month.
-- --------------------------------------------------------
CREATE TABLE contributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    recorded_by INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    contribution_month TINYINT NOT NULL CHECK (contribution_month BETWEEN 1 AND 12),
    contribution_year YEAR NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_member_month (member_id, contribution_month, contribution_year),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (recorded_by) REFERENCES admins(id)
);

-- --------------------------------------------------------
-- Table: cycles
-- Admin creates a cycle with a fixed payout amount and start date.
-- Admin sets member order manually.
-- Payout is monthly, same amount for all positions.
-- --------------------------------------------------------
CREATE TABLE cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chama_id INT NOT NULL,
    created_by INT NOT NULL,
    payout_amount DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    status ENUM('ACTIVE','COMPLETED','CANCELLED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chama_id) REFERENCES chamas(id),
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- --------------------------------------------------------
-- Table: cycle_positions
-- One row per member per cycle.
-- Admin assigns position_number (1 = first to receive payout).
-- expected_payout_date = start_date + (position_number - 1) months.
-- --------------------------------------------------------
CREATE TABLE cycle_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id INT NOT NULL,
    member_id INT NOT NULL,
    position_number INT NOT NULL,
    expected_payout_date DATE NOT NULL,
    actual_payout_date DATE,
    status ENUM('PENDING','PAID') DEFAULT 'PENDING',
    UNIQUE KEY unique_cycle_member (cycle_id, member_id),
    UNIQUE KEY unique_cycle_position (cycle_id, position_number),
    FOREIGN KEY (cycle_id) REFERENCES cycles(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- --------------------------------------------------------
-- Table: savings
-- Voluntary savings beyond monthly contributions.
-- Members can deposit and request withdrawals.
-- Interest and profit distribution are also recorded here.
-- --------------------------------------------------------
CREATE TABLE savings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    recorded_by INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type ENUM('DEPOSIT','WITHDRAWAL','INTEREST','PROFIT_SHARE') NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (recorded_by) REFERENCES admins(id)
);

-- --------------------------------------------------------
-- Table: savings_withdrawals
-- Members request a withdrawal. Admin approves or rejects.
-- --------------------------------------------------------
CREATE TABLE savings_withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    reviewed_by INT,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (reviewed_by) REFERENCES admins(id)
);

-- --------------------------------------------------------
-- Table: loans
-- Member requests an emergency loan.
-- Eligibility: overall_score > 60 AND has been reached by a cycle.
-- Interest rate fixed at 10% per month.
-- Overdue loans reduce score and reduce loan_limit. Do not block new loans.
-- --------------------------------------------------------
CREATE TABLE loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    reviewed_by INT,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 10.00,
    reason TEXT NOT NULL,
    repayment_period_months INT NOT NULL,
    status ENUM('PENDING','APPROVED','REJECTED','FULLY_PAID') DEFAULT 'PENDING',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (reviewed_by) REFERENCES admins(id)
);

-- --------------------------------------------------------
-- Table: loan_repayments
-- Auto-generated when a loan is approved.
-- One row per expected monthly repayment.
-- Admin marks each as PAID when received.
-- OVERDUE is set by the system when due_date passes unpaid.
-- --------------------------------------------------------
CREATE TABLE loan_repayments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    recorded_by INT,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status ENUM('PENDING','PAID','OVERDUE') DEFAULT 'PENDING',
    FOREIGN KEY (loan_id) REFERENCES loans(id),
    FOREIGN KEY (recorded_by) REFERENCES admins(id)
);

-- --------------------------------------------------------
-- Table: investments
-- Admin records Chama investments.
-- Tracks amount invested, current value, and profit/loss.
-- --------------------------------------------------------
CREATE TABLE investments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chama_id INT NOT NULL,
    recorded_by INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    investment_type ENUM('SHARES','LAND','BUSINESS','BONDS','OTHER') NOT NULL,
    amount_invested DECIMAL(12,2) NOT NULL,
    current_value DECIMAL(12,2) NOT NULL,
    expected_return DECIMAL(12,2),
    investment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chama_id) REFERENCES chamas(id),
    FOREIGN KEY (recorded_by) REFERENCES admins(id)
);

-- --------------------------------------------------------
-- Table: sms_messages
-- Records every SMS sent to members.
-- Integration with SMS provider comes after core system works.
-- --------------------------------------------------------
CREATE TABLE sms_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('QUEUED','SENT','FAILED') DEFAULT 'QUEUED',
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- --------------------------------------------------------
-- Table: audit_logs
-- Records every important financial action for accountability.
-- Who did what, to which record, and when.
-- --------------------------------------------------------
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    performed_by_admin INT,
    performed_by_member INT,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(50),
    target_id INT,
    details TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by_admin) REFERENCES admins(id),
    FOREIGN KEY (performed_by_member) REFERENCES members(id)
);