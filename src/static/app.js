document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const loginModal = document.getElementById("login-modal");
  const loginMessage = document.getElementById("login-message");
  const userIconBtn = document.getElementById("user-icon-btn");
  const userMenu = document.getElementById("user-menu");
  const usernameDIsplay = document.getElementById("username-display");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const signupContainer = document.getElementById("signup-container");
  const closeLoginModal = document.getElementById("close-login-modal");

  let currentSession = null;

  // Load session from localStorage if exists
  const savedSession = localStorage.getItem("teacherSession");
  if (savedSession) {
    currentSession = savedSession;
    verifySession();
  }

  // User menu toggle
  userIconBtn.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target) && !userIconBtn.contains(e.target)) {
      userMenu.classList.add("hidden");
    }
  });

  // Login button click
  loginBtn.addEventListener("click", () => {
    userMenu.classList.add("hidden");
    loginModal.classList.remove("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  // Close login modal
  closeLoginModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  // Close modal when clicking outside
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      if (response.ok) {
        const data = await response.json();
        currentSession = data.session_id;
        localStorage.setItem("teacherSession", currentSession);
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "success";
        setTimeout(() => {
          loginModal.classList.add("hidden");
          updateAuthUI();
          fetchActivities();
        }, 1000);
      } else {
        loginMessage.textContent = "Invalid username or password";
        loginMessage.className = "error";
      }
      loginMessage.classList.remove("hidden");
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Logout
  logoutBtn.addEventListener("click", async () => {
    if (currentSession) {
      await fetch(`/auth/logout?session_id=${currentSession}`, { method: "POST" });
      currentSession = null;
      localStorage.removeItem("teacherSession");
      updateAuthUI();
      fetchActivities();
    }
    userMenu.classList.add("hidden");
  });

  // Verify session is still valid
  async function verifySession() {
    if (!currentSession) return;

    try {
      const response = await fetch(
        `/auth/verify?session_id=${encodeURIComponent(currentSession)}`
      );
      const data = await response.json();

      if (!data.valid) {
        currentSession = null;
        localStorage.removeItem("teacherSession");
      }
      updateAuthUI();
    } catch (error) {
      console.error("Error verifying session:", error);
    }
  }

  // Update UI based on auth status
  function updateAuthUI() {
    if (currentSession) {
      signupContainer.classList.remove("hidden");
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      usernameDIsplay.classList.remove("hidden");
      usernameDIsplay.textContent = "Teacher: Logged in";
    } else {
      signupContainer.classList.add("hidden");
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      usernameDIsplay.classList.add("hidden");
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        currentSession
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        const registerBtn = currentSession
          ? `<button class="register-btn" data-activity="${name}">Register Student</button>`
          : "";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
          ${registerBtn}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      // Add event listeners to register buttons
      document.querySelectorAll(".register-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
          const activity = e.target.getAttribute("data-activity");
          activitySelect.value = activity;
          document.getElementById("email").focus();
          signupContainer.scrollIntoView({ behavior: "smooth" });
        });
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!currentSession) {
      messageDiv.textContent = "Please login as a teacher to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&session_id=${encodeURIComponent(currentSession)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentSession) {
      messageDiv.textContent = "Please login as a teacher to register students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&session_id=${encodeURIComponent(currentSession)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
