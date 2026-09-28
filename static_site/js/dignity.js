/* =============================================================================
 *  dignity.js — достоинства и Панчадха-майтри (5-уровневая дружба). window.LunDignity
 * =============================================================================
 *  Композитная дружба = найсаргика (природная) + татакалика (временная, по D1).
 *  Грады достоинств для Вимшопаки: свой 20, адхимитра 18, митра 15, сама 10,
 *  шатру 7, адхишатру 5 (значения PyJHora/BPHS).
 * ===========================================================================*/
(function () {
  var PL = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'];
  // управители знаков, 0-idx (Овен..Рыбы)
  var LORD = ['Ma', 'Ve', 'Me', 'Mo', 'Su', 'Me', 'Ve', 'Ma', 'Ju', 'Sa', 'Sa', 'Ju'];
  // природная дружба: друзья/враги (остальные — нейтралы). Направленная.
  var NAT = {
    Su: { fr: ['Mo', 'Ma', 'Ju'], en: ['Ve', 'Sa'] },
    Mo: { fr: ['Su', 'Me'], en: [] },
    Ma: { fr: ['Su', 'Mo', 'Ju'], en: ['Me'] },
    Me: { fr: ['Su', 'Ve'], en: ['Mo'] },
    Ju: { fr: ['Su', 'Mo', 'Ma'], en: ['Me', 'Ve'] },
    Ve: { fr: ['Me', 'Sa'], en: ['Su', 'Mo'] },
    Sa: { fr: ['Me', 'Ve'], en: ['Su', 'Mo', 'Ma'] },
  };
  // грады: индекс 0..5 -> значение (свой, адхимитра, митра, сама, шатру, адхишатру)
  var GRADE_VALUE = [20, 18, 15, 10, 7, 5];

  function natRel(p, q) { var n = NAT[p]; if (n.fr.indexOf(q) >= 0) return 1; if (n.en.indexOf(q) >= 0) return -1; return 0; }
  // временная дружба по знакам D1: 2,3,4,10,11,12 от p — друг(+1); 1,5,6,7,8,9 — враг(-1)
  function tempRel(psign, qsign) {
    var d = (((qsign - psign) % 12) + 12) % 12 + 1;   // 1..12
    return ([2, 3, 4, 10, 11, 12].indexOf(d) >= 0) ? 1 : -1;
  }
  // композитная матрица comp[p][q] в градах: 0 свой(не исп.), иначе 1..5 индекс грады>0
  // возвращаем сумму -2..+2 -> грейд-индекс 1..5 (адхимитра..адхишатру)
  function compositeMatrix(signs) {
    var comp = {};
    PL.forEach(function (p) {
      comp[p] = {};
      PL.forEach(function (q) {
        if (p === q) { comp[p][q] = 0; return; }
        var s = natRel(p, q) + tempRel(signs[p], signs[q]);   // -2..+2
        // -2->5(адхишатру),-1->4(шатру),0->3(сама),+1->2(митра),+2->1(адхимитра)
        comp[p][q] = 3 - s;
      });
    });
    return comp;
  }
  // достоинство планеты p в знаке sign0 (0-idx) при композитной матрице comp -> значение
  function dignityValue(p, sign0, comp) {
    var lord = LORD[sign0];
    if (lord === p) return GRADE_VALUE[0];               // свой знак
    return GRADE_VALUE[comp[p][lord]];                   // comp∈1..5 -> value
  }

  window.LunDignity = { PL: PL, LORD: LORD, NAT: NAT, GRADE_VALUE: GRADE_VALUE,
    natRel: natRel, tempRel: tempRel, compositeMatrix: compositeMatrix, dignityValue: dignityValue };
})();
