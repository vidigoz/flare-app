// _utils/floins.js — Utilidades de economía Floins Fase 1
//
// Ganar: first_flare (+10), register_phone (+25), publish (+2),
//        likes_received_5 (+3), likes_given (+1, máx 2/día)
// Gastar: fogata 6hr (-5), hoguera 12hr (-10), extend_active +1hr (-3)

export async function getFloinsBalance(sql, { userId, deviceId }) {
  if (userId) {
    const [row] = await sql`SELECT floins FROM users WHERE id = ${userId} LIMIT 1`;
    return row?.floins ?? 0;
  }
  const [row] = await sql`
    SELECT COALESCE(SUM(amount), 0) AS balance
    FROM floins_transactions
    WHERE device_id = ${deviceId}
  `;
  return parseInt(row?.balance ?? 0);
}

export async function addFloinsTransaction(sql, { userId, deviceId, amount, reason, flareId }) {
  await sql`
    INSERT INTO floins_transactions (user_id, device_id, amount, reason, flare_id)
    VALUES (${userId ?? null}, ${deviceId ?? null}, ${amount}, ${reason}, ${flareId ?? null})
  `;
  if (userId) {
    await sql`UPDATE users SET floins = floins + ${amount} WHERE id = ${userId}`;
  }
}

export async function canAfford(sql, { userId, deviceId, cost }) {
  const balance = await getFloinsBalance(sql, { userId, deviceId });
  return balance >= cost;
}
