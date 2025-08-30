@echo off
REM =================================
REM 🔍 Quick Payment Check Script (SQLite) - Windows
REM =================================

set PAYMENT_ID=3ae74d82-8a77-4735-b2d9-0d43530deaba
set DB_PATH=data\payments.db

echo 🔍 Checking Payment: %PAYMENT_ID%
echo ==================================

REM Check if database exists
if not exist "%DB_PATH%" (
    echo ❌ Database not found at: %DB_PATH%
    pause
    exit /b 1
)

echo.
echo 📋 1. MAIN PAYMENT RECORD:
echo ------------------------
sqlite3 "%DB_PATH%" "SELECT payment_id, service_name, description, amount, chain, status, wallet_address, tx_hash, created_at, updated_at, expires_at FROM payments WHERE payment_id = '%PAYMENT_ID%';"

echo.
echo 📊 2. PAYMENT EVENTS:
echo --------------------
sqlite3 "%DB_PATH%" "SELECT event_type, data, created_at FROM payment_events WHERE payment_id = '%PAYMENT_ID%' ORDER BY created_at ASC;"

echo.
echo 🌐 3. WEBHOOK LOGS:
echo ------------------
sqlite3 "%DB_PATH%" "SELECT webhook_url, response_status, created_at FROM webhook_logs WHERE payment_id = '%PAYMENT_ID%' ORDER BY created_at ASC;"

echo.
echo 💼 4. WALLET INFO (if exists):
echo ----------------------------
sqlite3 "%DB_PATH%" "SELECT address, chain, connected_at, last_activity, usdt_balance, payment_count, status FROM wallets w JOIN payments p ON w.address = p.wallet_address WHERE p.payment_id = '%PAYMENT_ID%';"

echo.
echo 🔄 5. AUTO-TRANSFER RECORDS:
echo ---------------------------
sqlite3 "%DB_PATH%" "SELECT from_address, to_address, amount, chain, success, tx_hash, created_at FROM auto_transfers at JOIN payments p ON at.from_address = p.wallet_address WHERE p.payment_id = '%PAYMENT_ID%' ORDER BY at.created_at ASC;"

echo.
echo 📈 6. SUMMARY:
echo -------------
sqlite3 "%DB_PATH%" "SELECT COUNT(*) as total_payments, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed FROM payments;"

echo.
echo ✅ Payment check completed!
pause
