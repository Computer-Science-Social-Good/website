const BallState = Object.freeze({
    MOVE: "move",
    SQUISH: "squish",
});
const MIN_SQUASH_SCALE_MIN = 0.6;
const SQUISH_DURATION_MS_MAX = 350;
const SQUISH_DURATION_MS_MIN = 150;
const NYAN_COLORS = [
    "#FF5C5C",
    "#FFA85C",
    "#FFE45C",
    "#8CE85C",
    "#5CB8FF",
    "#B25CFF",
];
const light_source_el = document.querySelector(".profile-img");
const HIGHLIGHT_OFFSET_PCT = 22;

const lerp = (start, end, t) => start + (end - start) * t;
// const map_range = (value, inMin, inMax, outMin, outMax) =>
//     ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

function getCollisions(x, y, diameter) {
    return {
        left: x <= 0,
        top: y <= 0,
        right: x + diameter >= window.innerWidth,
        bottom: y + diameter >= window.innerHeight,
    };
}

function makeBouncyBall(ball_properties) {
    const ball_element = document.createElement("div");
    const ball_diameter = 40 + Math.random() * 60; // 40-100px
    ball_element.className = "bouncy-ball";
    ball_element.style.backgroundColor = ball_properties.color;
    let ball_image_el;
    if (ball_properties.image_src !== undefined) {
        ball_image_el = document.createElement("img");
        ball_image_el.className = "bouncy-ball-image";
        ball_image_el.src = ball_properties.image_src;
        if (ball_properties.invert_image) {
            ball_image_el.style.filter = "invert(1)";
        }
        ball_element.appendChild(ball_image_el);
    }
    if (ball_properties.texture !== undefined) {
        ball_element.classList.add(ball_properties.texture);
    }

    if (ball_properties.url === undefined) {
        ball_element.setAttribute("aria-hidden", "true");
    } else {
        const link_element = document.createElement("a");
        link_element.href = ball_properties.url;
        link_element.target = "_blank";
        link_element.rel = "noopener noreferrer";
        link_element.setAttribute("aria-label", ball_properties.aria_label);
        ball_element.appendChild(link_element);
        ball_image_el.alt = ""; // Avoids double-labelling it
    }

    ball_element.style.width = ball_diameter + "px";
    ball_element.style.height = ball_diameter + "px";
    ball_element.style.animationDuration = 3 + Math.random() * 4 + "s";

    document.body.appendChild(ball_element);

    let x = Math.random() * (window.innerWidth - ball_diameter);
    let y = Math.random() * (window.innerHeight - ball_diameter);
    const vx_max = (1 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1);
    const vy_max = (1 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1);
    const v_max = Math.sqrt(18);
    let vx = vx_max;
    let vy = vy_max;

    let last_time;
    let state = BallState.MOVE;
    let squishing_x = false;
    let squishing_y = false;
    let squish_progress_x = 0;
    let squish_progress_y = 0;
    let vx_before_squish = vx;
    let vy_before_squish = vy;
    let scale_x;
    let scale_y;
    let squish_duration_ms;
    let min_squish_scale;

    let collisions = getCollisions(x, y, ball_diameter);

    function endSquish() {
        state = BallState.MOVE;
        scale_x = 1;
        scale_y = 1;
        squishing_x = false;
        squishing_y = false;
        if (ball_image_el !== undefined) {
            ball_image_el.style.animationPlayState = "running";
        }
    }

    function adjustPositionalStyles() {
        switch (ball_properties.texture) {
            case "shiny": {
                const light_rect = light_source_el.getBoundingClientRect();
                const light_center_x = light_rect.left + light_rect.width / 2;
                const light_center_y = light_rect.top + light_rect.height / 2;
                const ball_center_x = x + ball_diameter / 2;
                const ball_center_y = y + ball_diameter / 2;

                const angle = Math.atan2(
                    light_center_y - ball_center_y,
                    light_center_x - ball_center_x,
                );

                const highlight_x = 50 + HIGHLIGHT_OFFSET_PCT * Math.cos(angle);
                const highlight_y = 50 + HIGHLIGHT_OFFSET_PCT * Math.sin(angle);
                const shadow_x = 50 - HIGHLIGHT_OFFSET_PCT * Math.cos(angle);
                const shadow_y = 50 - HIGHLIGHT_OFFSET_PCT * Math.sin(angle);

                ball_element.style.backgroundImage = `
                                    radial-gradient(
                                        circle at ${highlight_x}% ${highlight_y}%,
                                        rgba(255, 253, 235, 0.7),
                                        rgba(255, 253, 235, 0.55) 25%,
                                        rgba(255, 253, 235, 0.3) 50%,
                                        rgba(255, 253, 235, 0.12) 70%,
                                        rgba(255, 253, 235, 0) 90%
                                    ),
                                    radial-gradient(
                                        circle at ${shadow_x}% ${shadow_y}%,
                                        rgba(0, 0, 0, 0.25),
                                        rgba(0, 0, 0, 0) 60%
                                    )
                            `;
                break;
            }
            default:
                break;
        }
    }

    function moveAndBounceSquishy(timestamp) {
        if (last_time === undefined) last_time = timestamp;
        const delta_time = timestamp - last_time;
        last_time = timestamp;
        x_prev = x;
        y_prev = y;

        switch (state) {
            case BallState.MOVE:
                x += vx;
                y += vy;
                collisions = getCollisions(x, y, ball_diameter);
                if (
                    collisions.left ||
                    collisions.right ||
                    collisions.top ||
                    collisions.bottom
                ) {
                    if (!(state == BallState.SQUISH)) {
                        state = BallState.SQUISH;
                        if (collisions.left || collisions.right) {
                            squish_progress_x = 0;
                            squishing_x = true;
                        }
                        if (collisions.top || collisions.bottom) {
                            squish_progress_y = 0;
                            squishing_y = true;
                        }
                        if (squishing_x || squishing_y) {
                            if (ball_image_el !== undefined) {
                                ball_image_el.style.animationPlayState =
                                    "paused";
                            }
                        }
                    }
                    if (collisions.left) {
                        x = 0;
                    }
                    if (collisions.right) {
                        x = window.innerWidth - ball_diameter;
                    }
                    if (collisions.top) {
                        y = 0;
                    }
                    if (collisions.bottom) {
                        y = window.innerHeight - ball_diameter;
                    }
                    const v_to_vmax_ratio =
                        Math.sqrt(vx * vx + vy * vy) / v_max;
                    squish_duration_ms = lerp(
                        SQUISH_DURATION_MS_MAX,
                        SQUISH_DURATION_MS_MIN,
                        v_to_vmax_ratio,
                    );
                    min_squish_scale = lerp(
                        1,
                        MIN_SQUASH_SCALE_MIN,
                        v_to_vmax_ratio,
                    );
                }
                break;
            case BallState.SQUISH:
                if (squishing_x) {
                    if (squish_progress_x == 0) {
                        vx_before_squish = vx;
                        vx = 0;
                    } else if (squish_progress_x < 0.5) {
                        if (collisions.left) {
                            scale_x = lerp(
                                1,
                                min_squish_scale,
                                squish_progress_x * 2,
                            );
                        } else {
                            // right
                            scale_x = lerp(
                                1,
                                min_squish_scale,
                                squish_progress_x * 2,
                            );
                        }
                    } else if (squish_progress_x < 1) {
                        if (collisions.left) {
                            scale_x = lerp(
                                min_squish_scale,
                                1,
                                (squish_progress_x - 0.5) * 2,
                            );
                        } else {
                            // right
                            scale_x = lerp(
                                min_squish_scale,
                                1,
                                (squish_progress_x - 0.5) * 2,
                            );
                        }
                    }
                    squish_progress_x += delta_time / squish_duration_ms;
                }
                if (squishing_y) {
                    if (squish_progress_y == 0) {
                        vy_before_squish = vy;
                        vy = 0;
                    } else if (squish_progress_y < 0.5) {
                        scale_y = lerp(
                            1,
                            min_squish_scale,
                            squish_progress_y * 2,
                        );
                    } else if (squish_progress_y < 1) {
                        scale_y = lerp(
                            min_squish_scale,
                            1,
                            (squish_progress_y - 0.5) * 2,
                        );
                    }
                    squish_progress_y += delta_time / squish_duration_ms;
                }
                if (squishing_x && squishing_y) {
                    if (squish_progress_x >= 1 && squish_progress_y >= 1) {
                        endSquish();
                        vx = -vx_before_squish;
                        vy = -vy_before_squish;
                    }
                } else if (squishing_x) {
                    if (squish_progress_x >= 1) {
                        endSquish();
                        vx = -vx_before_squish;
                    } else {
                        scale_y = 1 / Math.sqrt(scale_x);
                    }
                } else if (squishing_y) {
                    if (squish_progress_y >= 1) {
                        endSquish();
                        vy = -vy_before_squish;
                    } else {
                        scale_x = 1 / Math.sqrt(scale_y);
                    }
                }

                x += vx;
                y += vy;
                break;
            default:
                console.error(`Unknown state reached: ${state}`);
                break;
        }

        const origin_x = collisions.left
            ? "left"
            : collisions.right
              ? "right"
              : "center";
        const origin_y = collisions.top
            ? "top"
            : collisions.bottom
              ? "bottom"
              : "center";

        ball_element.style.left = x + "px";
        ball_element.style.top = y + "px";
        ball_element.style.transformOrigin = `${origin_x} ${origin_y}`;
        ball_element.style.transform = `scale(${scale_x}, ${scale_y})`;

        adjustPositionalStyles();

        requestAnimationFrame(moveAndBounceSquishy);
    }
    moveAndBounceSquishy();
}

document.addEventListener("DOMContentLoaded", () => {
    /*
                scaleY * scaleX ** 2 = 1
                scaleX = scaleY_correction = 1 / sqrt(scaleY)
                scaleY < 1, scaleX > 1
                */

    // Typing effect for title
    const titleEl = document.getElementById("typed-title");
    const titleText = "Frank Murphy";
    let charIndex = 0;
    function typeChar() {
        if (charIndex < titleText.length) {
            titleEl.textContent += titleText[charIndex];
            charIndex++;
            setTimeout(typeChar, 100 + Math.random() * 80);
        } else {
            // Keep cursor blinking for a bit, then remove it
            setTimeout(() => {
                titleEl.classList.add("done-typing");
            }, 2500);
        }
    }
    setTimeout(typeChar, 500); // small delay before typing starts

    // Balls
    makeBouncyBall({
        color: "",
        texture: null,
        image_src: "../assets/frank-murphy/images/github-icon.svg",
        invert_image: true,
        url: "https://github.com/frankm24",
        aria_label: "Frank Murphy's GitHub Profile",
    });
    makeBouncyBall({
        color: "",
        texture: null,
        image_src: "../assets/frank-murphy/images/linkedin-icon.svg",
        invert_image: true,
        url: "https://linkedin.com/in/frank-murphy-ud",
        aria_label: "Frank Murphy's LinkedIn Profile",
    });

    const balls = [
        {
            color: NYAN_COLORS[0],
            texture: "rough",
        },
        {
            color: NYAN_COLORS[1],
            texture: "shiny",
        },
        {
            color: NYAN_COLORS[2],
            texture: "rough",
        },
        {
            color: NYAN_COLORS[3],
            texture: "shiny",
        },
        {
            color: NYAN_COLORS[4],
            texture: "rough",
        },
        {
            color: NYAN_COLORS[5],
            texture: "shiny",
        },
    ];

    balls.forEach((ball_properties) => {
        makeBouncyBall(ball_properties);
    });

    // Secret RickRoll Portal
    const portal = document.getElementById("secret-portal");
    const profileImg = document.querySelector(".profile-img");

    const hint = document.getElementById("drag-hint");
    function positionHint() {
        const rect = profileImg.getBoundingClientRect();
        const hintRect = hint.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        hint.style.top = `${centerY - hintRect.height / 2}px`;
    }
    positionHint();
    // re-run if window resizes (keeps alignment responsive)
    window.addEventListener("resize", positionHint);
    // Enable animations AFTER init
    requestAnimationFrame(() => {
        hint.classList.add("animate");
    });

    // Show after 3 seconds
    setTimeout(() => {
        hint.classList.add("show");
    }, 3000);

    // Hide on first click/drag
    profileImg.addEventListener("mousedown", () => {
        hint.classList.remove("show");
    });

    const initRect = profileImg.getBoundingClientRect();
    document.body.style.backgroundImage = `
                            radial-gradient(
                                circle at ${
                                    initRect.x + initRect.width / 2
                                }px ${initRect.y + initRect.height / 2}px,
                                rgba(255, 255, 0, 0.3) 0%,
                                rgba(255, 255, 0, 0.1) 30%,
                                rgba(0, 0, 0, 0.8) 100%
                            ),
                            url('../assets/frank-murphy/images/nyan-cat-wallpaper.jpg')
                        `;

    let isDragging = false;
    let portalTriggered = false;

    profileImg.addEventListener("mousedown", (e) => {
        e.preventDefault(); // stop default browser ghost

        isDragging = true;

        const onMouseMove = (moveEvent) => {
            if (!isDragging) return;

            profileImg.style.position = "absolute";
            profileImg.style.left = `${
                moveEvent.clientX - profileImg.offsetWidth / 2
            }px`;
            profileImg.style.top = `${
                moveEvent.clientY - profileImg.offsetHeight / 2
            }px`;

            // update background gradient position as the image moves
            document.body.style.backgroundImage = `
                            radial-gradient(
                                circle at ${moveEvent.clientX}px ${moveEvent.clientY}px,
                                rgba(255, 255, 0, 0.3) 0%,
                                rgba(255, 255, 0, 0.1) 30%,
                                rgba(0, 0, 0, 0.8) 100%
                            ),
                            url('../assets/frank-murphy/images/nyan-cat-wallpaper.jpg')
                        `;

            // Secret portal proximity check
            const portal_rect = portal.getBoundingClientRect();
            const portal_center_x = portal_rect.left + portal_rect.width / 2;
            const portal_center_y = portal_rect.top + portal_rect.height / 2;
            const dist = Math.hypot(
                moveEvent.clientX - portal_center_x,
                moveEvent.clientY - portal_center_y,
            );
            if (dist < 200) {
                portal.classList.add("visible");
            } else {
                portal.classList.remove("visible");
            }
            if (dist < 60 && !portalTriggered) {
                portalTriggered = true;
                window.location.href =
                    "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });
});
