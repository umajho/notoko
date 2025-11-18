import { action, createAsync, query, useAction } from "@solidjs/router";

let count = 100;

const increaseCountAction = action(async () => {
  "use server";
  count += 1;
}, "increaseCount");
const countQuery = query(async () => {
  "use server";
  return count;
}, "count");

export default function Counter() {
  const count = createAsync(() => countQuery());
  const increaseCount = useAction(increaseCountAction);

  return (
    <button
      class="w-[200px] rounded-full bg-gray-100 border-2 border-gray-300 focus:border-gray-400 active:border-gray-400 px-[2rem] py-[1rem]"
      onClick={() => increaseCount()}
    >
      Clicks: {count()}
    </button>
  );
}
