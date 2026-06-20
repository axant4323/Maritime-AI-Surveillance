import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

fig = plt.figure(figsize=(10,10))
ax = fig.add_subplot(111, projection='3d')

# Dark background
fig.patch.set_facecolor('black')
ax.set_facecolor('black')

# Volcano mesh
theta = np.linspace(0, 2*np.pi, 150)
r = np.linspace(0, 5, 150)

R, T = np.meshgrid(r, theta)

Xv = R*np.cos(T)
Yv = R*np.sin(T)

# Crater
Zv = 6 - 1.2*R + 0.2*np.sin(8*T)
Zv = np.maximum(Zv, 0)

# Lava particles
n = 3000

# Pre-generate particle directions
angles = np.random.uniform(0, 2*np.pi, n)
speeds = np.random.uniform(0.3, 1.2, n)

def animate(frame):
    ax.clear()

    ax.set_facecolor("black")

    # Volcano
    ax.plot_surface(
        Xv, Yv, Zv,
        cmap='gist_earth',
        linewidth=0,
        antialiased=True,
        alpha=1
    )

    t = frame * 0.08

    # Fountain eruption
    z = np.abs(
        15*np.sin(
            t + np.random.rand(n)*2*np.pi
        )
    )

    radius = speeds * z * 0.08

    x = radius*np.cos(angles)
    y = radius*np.sin(angles)

    # Lava particles
    ax.scatter(
        x, y, z + 5,
        c=z,
        cmap='hot',
        s=8,
        alpha=0.9
    )

    # Smoke
    smoke_n = 1000

    sx = np.random.normal(0, 1.2, smoke_n)
    sy = np.random.normal(0, 1.2, smoke_n)

    sz = np.random.uniform(
        10,
        22,
        smoke_n
    )

    ax.scatter(
        sx, sy, sz,
        c='lightgray',
        alpha=0.05,
        s=50
    )

    # Glowing crater
    crater_r = np.random.uniform(0, 0.8, 600)

    crater_theta = np.random.uniform(
        0,
        2*np.pi,
        600
    )

    cx = crater_r*np.cos(crater_theta)
    cy = crater_r*np.sin(crater_theta)

    ax.scatter(
        cx,
        cy,
        np.full(600, 5.2),
        c='yellow',
        s=20,
        alpha=0.8
    )

    # Smooth cinematic rotation
    ax.view_init(
        elev=20 + 5*np.sin(frame/40),
        azim=frame*0.8
    )

    ax.set_xlim(-6,6)
    ax.set_ylim(-6,6)
    ax.set_zlim(0,25)

    ax.set_axis_off()

    ax.set_title(
        "🌋 Volcanic Eruption",
        color='white',
        fontsize=18
    )

ani = FuncAnimation(
    fig,
    animate,
    frames=720,
    interval=30,
    repeat=True
)
plt.show()

