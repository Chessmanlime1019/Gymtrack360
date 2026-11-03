"""
GYMTRACK 360 · Simulación de un modelo de Machine Learning para predecir
el abandono de clientes (no renovación de membresía).

IMPORTANTE: usa DATOS SIMULADOS. El sistema real todavía no tiene historial
suficiente; esta simulación demuestra el método y lo compara con la regla
fija que hoy usa la pantalla "Seguimiento" del profesional
(sin venir 7+ días o membresía por vencer en 7 días o menos).

Las variables son las mismas que GYMTRACK 360 ya registra en Supabase:
asistencias, membresías, rutinas y renovaciones.

Uso:  python analitica/modelo_abandono.py [carpeta_salida]
Requiere solo numpy y matplotlib (regresión logística implementada a mano).
"""

import json
import sys
from pathlib import Path

import numpy as np

SEMILLA = 360
N = 800
VARIABLES = [
    "Días sin venir",
    "Visitas últimos 30 días",
    "Días para vencer",
    "Tiene rutina activa",
    "Renovaciones previas",
]


def simular_clientes(rng):
    dias_sin_venir = np.clip(rng.exponential(7, N), 0, 45).round()
    visitas_30d = np.clip(rng.poisson(np.maximum(1, 14 - dias_sin_venir * 0.4)), 0, 30)
    dias_para_vencer = rng.integers(-10, 45, N)
    tiene_rutina = rng.binomial(1, 0.6, N)
    renovaciones = rng.poisson(1.6, N)

    # Relación "real" (desconocida para el modelo) + ruido.
    logit = (
        +0.4
        + 0.11 * dias_sin_venir
        - 0.10 * visitas_30d
        - 0.015 * dias_para_vencer
        - 1.0 * tiene_rutina
        - 0.45 * renovaciones
        + rng.normal(0, 0.6, N)
    )
    abandona = rng.binomial(1, 1 / (1 + np.exp(-logit)))
    X = np.column_stack([dias_sin_venir, visitas_30d, dias_para_vencer, tiene_rutina, renovaciones]).astype(float)
    return X, abandona


def entrenar_logistica(X, y, lr=0.1, epocas=3000, l2=0.01):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        p = 1 / (1 + np.exp(-(X @ w + b)))
        w -= lr * (X.T @ (p - y) / len(y) + l2 * w)
        b -= lr * np.mean(p - y)
    return w, b


def metricas(y, pred, prob=None):
    tp = int(((pred == 1) & (y == 1)).sum())
    tn = int(((pred == 0) & (y == 0)).sum())
    fp = int(((pred == 1) & (y == 0)).sum())
    fn = int(((pred == 0) & (y == 1)).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    m = {
        "exactitud": (tp + tn) / len(y),
        "precision": precision,
        "sensibilidad": recall,
        "f1": f1,
        "matriz": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
    }
    if prob is not None:
        # AUC por el estadístico de Mann-Whitney.
        orden = prob.argsort().argsort() + 1
        pos = y == 1
        m["auc"] = (orden[pos].sum() - pos.sum() * (pos.sum() + 1) / 2) / (pos.sum() * (~pos).sum())
    return m


def main(salida: Path):
    rng = np.random.default_rng(SEMILLA)
    X, y = simular_clientes(rng)

    idx = rng.permutation(N)
    corte = int(N * 0.7)
    ent, pru = idx[:corte], idx[corte:]

    media, desv = X[ent].mean(0), X[ent].std(0)
    Xs = (X - media) / desv
    w, b = entrenar_logistica(Xs[ent], y[ent])

    # Umbral elegido SOLO con datos de entrenamiento (el que maximiza F1):
    # en retención importa más no dejar escapar a quien va a abandonar.
    prob_ent = 1 / (1 + np.exp(-(Xs[ent] @ w + b)))
    umbrales = np.arange(0.10, 0.71, 0.01)
    umbral = float(max(umbrales, key=lambda u: metricas(y[ent], (prob_ent >= u).astype(int))["f1"]))

    prob = 1 / (1 + np.exp(-(Xs[pru] @ w + b)))
    modelo = metricas(y[pru], (prob >= umbral).astype(int), prob)
    modelo["umbral"] = round(umbral, 2)

    # Regla actual de la pantalla "Seguimiento".
    regla_pred = ((X[pru, 0] >= 7) | ((X[pru, 2] >= 0) & (X[pru, 2] <= 7))).astype(int)
    regla = metricas(y[pru], regla_pred)

    resultado = {
        "datos": "simulados",
        "clientes": N,
        "entrenamiento": len(ent),
        "prueba": len(pru),
        "tasa_abandono": float(y.mean()),
        "modelo": modelo,
        "regla_actual": regla,
        "coeficientes": dict(zip(VARIABLES, map(float, w))),
    }
    salida.mkdir(parents=True, exist_ok=True)
    (salida / "resultados_modelo.json").write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding="utf-8")

    grafico(resultado, salida / "figura_modelo_abandono.png")
    print(json.dumps(resultado, indent=2, ensure_ascii=False))


def grafico(r, ruta):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    azul, naranja, gris = "#1F3864", "#F26B1D", "#9AA5B8"
    plt.rcParams.update({"font.family": "Calibri", "font.size": 11})
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(10.5, 4.0), gridspec_kw={"width_ratios": [1.1, 1]})

    coef = sorted(r["coeficientes"].items(), key=lambda kv: abs(kv[1]))
    nombres = [k for k, _ in coef]
    valores = [v for _, v in coef]
    a1.barh(nombres, valores, color=[naranja if v > 0 else azul for v in valores])
    a1.axvline(0, color="#444", lw=0.8)
    a1.set_title("a) Peso de cada variable en el riesgo", loc="left", fontsize=11, fontweight="bold")
    a1.set_xlabel("Coeficiente estandarizado (+ aumenta el riesgo)")
    a1.spines[["top", "right"]].set_visible(False)

    etiquetas = ["Exactitud", "Precisión", "Sensibilidad", "F1"]
    claves = ["exactitud", "precision", "sensibilidad", "f1"]
    x = np.arange(len(etiquetas))
    regla = [r["regla_actual"][k] for k in claves]
    modelo = [r["modelo"][k] for k in claves]
    a2.bar(x - 0.2, regla, 0.4, label="Regla fija actual", color=gris)
    a2.bar(x + 0.2, modelo, 0.4, label="Modelo ML (regresión logística)", color=azul)
    for i, (v1, v2) in enumerate(zip(regla, modelo)):
        a2.text(i - 0.2, v1 + 0.015, f"{v1:.2f}", ha="center", fontsize=9)
        a2.text(i + 0.2, v2 + 0.015, f"{v2:.2f}", ha="center", fontsize=9)
    a2.set_xticks(x, etiquetas)
    a2.set_ylim(0, 1.08)
    a2.set_title("b) Desempeño en el conjunto de prueba", loc="left", fontsize=11, fontweight="bold")
    a2.legend(frameon=False, fontsize=9, loc="upper center", bbox_to_anchor=(0.5, -0.1), ncol=2)
    a2.spines[["top", "right"]].set_visible(False)

    fig.tight_layout()
    fig.savefig(ruta, dpi=200)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "salida")
