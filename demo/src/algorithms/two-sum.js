// Приклад до рівня «Високий» практичного завдання № 1: задача LeetCode 1. Two Sum.
// Потрібно знайти індекси двох чисел масиву, сума яких дорівнює target.
// Один прохід з Map: для кожного числа перевіряємо, чи вже траплялося «доповнення» target - x.
// Часова складність O(n), пам’ять O(n) – замість O(n²) для двох вкладених циклів.

/**
 * @param {number[]} nums
 * @param {number} target
 * @returns {[number, number] | null}
 */
export function twoSum(nums, target) {
  const seen = new Map(); // число → індекс
  for (const [i, x] of nums.entries()) {
    const j = seen.get(target - x);
    if (j !== undefined) return [j, i];
    seen.set(x, i);
  }
  return null;
}
