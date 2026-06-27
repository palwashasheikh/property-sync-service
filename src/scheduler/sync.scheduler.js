const cron = require('node-cron');
const { ingestAll } = require('../ingestion/pipeline');

const bayut = require('../../mock-sources/bayut.source');
const propertyFinder = require('../../mock-sources/property-finder.source');
const dubizzle = require('../../mock-sources/dubizzle.source');

const SOURCES = [bayut, propertyFinder, dubizzle];

let isRunning = false;

async function runSync() {
  if (isRunning) {
    console.log('⏭️  Sync already in progress, skipping this run');
    return;
  }

  isRunning = true;
  console.log(`\n📡 Sync started at ${new Date().toISOString()}`);

  try {
    const results = await ingestAll(SOURCES);
    const summary = results.reduce(
      (acc, r) => ({
        fetched: acc.fetched + r.total_fetched,
        inserted: acc.inserted + r.total_inserted,
        updated: acc.updated + r.total_updated,
        duplicates: acc.duplicates + r.total_duplicates
      }),
      { fetched: 0, inserted: 0, updated: 0, duplicates: 0 }
    );
    console.log(`\n📊 Sync complete — fetched: ${summary.fetched}, inserted: ${summary.inserted}, updated: ${summary.updated}, duplicates: ${summary.duplicates}`);
  } catch (err) {
    console.error('Sync failed:', err.message);
  } finally {
    isRunning = false;
  }
}

function startScheduler() {
  // Run immediately on startup
  runSync();

  // Then every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    console.log('⏰ Scheduled sync triggered');
    runSync();
  });

  console.log('🕐 Scheduler started — syncing every 30 minutes');
}

module.exports = { startScheduler, runSync };
