// Защита от двойного сжигания и гонки «отмена ↔ burn» (в пределах процесса).
// Пока продажа сжигается, её id лежит здесь: нельзя запустить второй burn
// на тот же id и нельзя отменить продажу, которая прямо сейчас жжётся.
//
// Важно: это in-memory защита для ОДНОГО экземпляра бота. От двойного сжигания
// при рестарте «между confirm и markAsBurned» она не спасает — для этого
// служит идемпотентная пометка в БД (markAsBurned ... WHERE burned = 0).
const inProgress = new Set<number>();

/** Захватить продажу под burn. false — уже жжётся (повтор не запускаем). */
export function beginBurn(saleId: number): boolean {
  if (inProgress.has(saleId)) return false;
  inProgress.add(saleId);
  return true;
}

/** Освободить продажу после завершения (успех или ошибка). */
export function endBurn(saleId: number): void {
  inProgress.delete(saleId);
}

/** Жжётся ли продажа прямо сейчас (для запрета отмены). */
export function isBurning(saleId: number): boolean {
  return inProgress.has(saleId);
}
