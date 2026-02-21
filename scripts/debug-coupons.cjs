const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "src", "database.sqlite");
const db = new Database(dbPath);

console.log("\n=== Checking Coupons in Database ===\n");

// Check a few coupons
const coupons = db
  .prepare(
    `SELECT id, business_id, title, coupon_code, is_active, start_date, end_date,
    datetime(start_date) as start_parsed,
    datetime(end_date) as end_parsed,
    datetime('now') as now
    FROM coupons LIMIT 3`
  )
  .all();

coupons.forEach((c) => {
  console.log(`Coupon: ${c.coupon_code}`);
  console.log(`  Business ID: ${c.business_id} (type: ${typeof c.business_id})`);
  console.log(`  Active: ${c.is_active}`);
  console.log(`  Start: ${c.start_date} -> parsed: ${c.start_parsed}`);
  console.log(`  End: ${c.end_date} -> parsed: ${c.end_parsed}`);
  console.log(`  Now: ${c.now}`);
  console.log(`  Start OK: ${c.start_parsed <= c.now}`);
  console.log(`  End OK: ${c.end_parsed >= c.now}`);
  console.log("");
});

// Test the actual query with business_id = "1"
console.log("\n=== Testing getActiveCouponsForBusiness('1') ===\n");
const active1 = db
  .prepare(
    `SELECT * FROM coupons 
     WHERE business_id = '1' 
       AND is_active = 1
       AND datetime(start_date) <= datetime('now')
       AND datetime(end_date) >= datetime('now')`
  )
  .all();
console.log(`Found ${active1.length} active coupons for business_id='1'`);

// Test with integer
console.log("\n=== Testing with business_id = 1 (integer) ===\n");
const active1int = db
  .prepare(
    `SELECT * FROM coupons 
     WHERE business_id = 1 
       AND is_active = 1
       AND datetime(start_date) <= datetime('now')
       AND datetime(end_date) >= datetime('now')`
  )
  .all();
console.log(`Found ${active1int.length} active coupons for business_id=1`);

db.close();
