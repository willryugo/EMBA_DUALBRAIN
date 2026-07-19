import { redirect } from "next/navigation";

// 루트는 dualbrain.studio 소유자(수달님) 개인 용도로 비워 둔 자리다.
// 지금은 원우들이 도메인만 쳐도 닿도록 매거진으로 넘긴다 —
// 나중에 최상위 index를 직접 쓰려면 이 redirect 를 지우고 페이지를 그리면 된다.
export default function Page() {
  redirect("/magazine");
}
