/**
 * Backfill `companyId` on legacy Machinery and Equipment records.
 *
 * Machines/equipment created before company isolation was enforced have no
 * companyId, so company users can no longer see them. This script infers the
 * owning company, in order of confidence:
 *   1. The asset's own UserDepartment -> department.companyId
 *   2. Departments of maintenance records that reference the asset
 *      (preventive maintenance, work requests, calibration records)
 *   3. The CreatedBy name/email matched against users (only if unambiguous)
 *
 * Records whose company cannot be determined unambiguously are listed and
 * left untouched (only super-admins will see them until fixed manually).
 *
 * Usage (from the backend root):
 *   node scripts/backfill-maintenance-company.mjs           # dry run
 *   node scripts/backfill-maintenance-company.mjs --apply   # write changes
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set (expected in .env)');
  process.exit(1);
}

const loose = () => new mongoose.Schema({}, { strict: false });
const Department = mongoose.model('Department', loose());
const User = mongoose.model('User', loose());
const Machinery = mongoose.model('Machinery', loose());
const Equipment = mongoose.model('Equipment', loose());
const PreventiveMaintenance = mongoose.model('PreventiveMaintenance', loose());
const WorkRequest = mongoose.model('WorkRequest', loose());
const CalibrationRecord = mongoose.model('CalibrationRecord', loose());

const idStr = (v) => (v == null ? null : String(v?._id ?? v));

async function main() {
  await mongoose.connect(uri);

  const depts = await Department.find({}, { companyId: 1 }).lean();
  const deptCompany = new Map(
    depts.filter((d) => d.companyId).map((d) => [idStr(d._id), idStr(d.companyId)]),
  );

  const users = await User.find({}, { name: 1, email: 1, userName: 1, companyId: 1 }).lean();
  const userCompaniesByKey = new Map();
  for (const u of users) {
    if (!u.companyId) continue;
    for (const key of [u.name, u.email, u.userName]) {
      if (!key) continue;
      const k = String(key).trim().toLowerCase();
      if (!userCompaniesByKey.has(k)) userCompaniesByKey.set(k, new Set());
      userCompaniesByKey.get(k).add(idStr(u.companyId));
    }
  }

  const uniqueOrNull = (set) => (set && set.size === 1 ? [...set][0] : null);

  async function companiesFromRefs(refModels, field, assetId) {
    const found = new Set();
    for (const M of refModels) {
      const rows = await M.find(
        { [field]: assetId },
        { UserDepartment: 1, Department: 1 },
      ).lean();
      for (const r of rows) {
        const c = deptCompany.get(idStr(r.UserDepartment ?? r.Department));
        if (c) found.add(c);
      }
    }
    return found;
  }

  async function backfill(label, Model, refModels, refField) {
    const legacy = await Model.find({
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    }).lean();
    let fixed = 0;
    const unresolved = [];

    for (const asset of legacy) {
      let companyId = deptCompany.get(idStr(asset.UserDepartment)) ?? null;
      let via = 'department';
      if (!companyId) {
        companyId = uniqueOrNull(await companiesFromRefs(refModels, refField, asset._id));
        via = 'maintenance records';
      }
      if (!companyId && asset.CreatedBy) {
        companyId = uniqueOrNull(
          userCompaniesByKey.get(String(asset.CreatedBy).trim().toLowerCase()),
        );
        via = 'CreatedBy';
      }

      const name = asset.machineName ?? asset.equipmentName;
      const code = asset.machineCode ?? asset.equipmentCode;
      if (!companyId) {
        unresolved.push(`${code ?? asset._id} "${name}" (CreatedBy: ${asset.CreatedBy ?? '-'})`);
        continue;
      }
      console.log(`  ${label} ${code} "${name}" -> company ${companyId} (via ${via})`);
      if (APPLY) {
        await Model.updateOne(
          { _id: asset._id },
          { $set: { companyId: new mongoose.Types.ObjectId(companyId) } },
        );
      }
      fixed++;
    }

    console.log(`${label}: ${legacy.length} legacy, ${fixed} resolved, ${unresolved.length} unresolved`);
    for (const u of unresolved) console.log(`  UNRESOLVED ${label} ${u}`);
  }

  await backfill('Machinery', Machinery, [PreventiveMaintenance, WorkRequest], 'Machinery');
  await backfill('Equipment', Equipment, [CalibrationRecord, WorkRequest], 'Equipment');

  console.log(APPLY ? '\nChanges written.' : '\nDry run — re-run with --apply to write.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
