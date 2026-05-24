export function Footer({ todayLabel }: { todayLabel: string }) {
  return (
    <footer>
      <div className="wrap">
        <div className="frow">
          <div className="col">
            <h5>DUALBRAIN</h5>
            <p>
              분석과 직관, 개인과 집단의 두 뇌. EMBA 17기 52명의 학습이 한 곳에
              모인다.
            </p>
          </div>
          <div className="col">
            <h5>EDITION</h5>
            <p>
              VOL.01 · {todayLabel}
              <br />
              Yonsei EMBA 17 · 1 Day 1 Learning
            </p>
          </div>
          <div className="col">
            <h5>SOURCE</h5>
            <p>
              핸드오프 · cards.json (실데이터 12장)
              <br />
              NAS 자료실 → 듀얼브레인
            </p>
          </div>
        </div>
        <div className="copy">
          © 2026 EMBA17 · DualBrain Magazine · Built with 두 번째 뇌
        </div>
      </div>
    </footer>
  );
}
