import './style.css'
import { Clerk } from '@clerk/clerk-js'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const clerk = new Clerk(clerkPubKey)

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Clerk Authentication</h1>
    <div id="sign-in-div"></div>
    <div id="sign-up-div" style="display:none;"></div>
    <button id="toggle-mode">Switch to Sign Up</button>
  </div>
`

// Load Clerk with UI components
await clerk.load()

// Create custom sign-in form
const signInDiv = document.getElementById('sign-in-div')
signInDiv.innerHTML = `
  <form id="sign-in-form">
    <h2>Sign In</h2>
    <div>
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required>
    </div>
    <div>
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required>
    </div>
    <button type="submit">Sign In</button>
  </form>
`

const signUpDiv = document.getElementById('sign-up-div')
signUpDiv.innerHTML = `
  <form id="sign-up-form">
    <h2>Sign Up</h2>
    <div>
      <label for="signup-email">Email:</label>
      <input type="email" id="signup-email" name="email" required>
    </div>
    <div>
      <label for="signup-password">Password:</label>
      <input type="password" id="signup-password" name="password" required>
    </div>
    <div>
      <label for="signup-confirm">Confirm Password:</label>
      <input type="password" id="signup-confirm" name="confirm" required>
    </div>
    <button type="submit">Sign Up</button>
  </form>
`

// Handle sign-in form submission
document.getElementById('sign-in-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  
  try {
    const result = await clerk.client.signIn.create({
      identifier: email,
      password: password
    })
    alert('Sign in successful!')
    console.log('Sign in result:', result)
  } catch (error) {
    alert('Sign in failed: ' + error.message)
  }
})

// Handle sign-up form submission
document.getElementById('sign-up-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('signup-email').value
  const password = document.getElementById('signup-password').value
  const confirm = document.getElementById('signup-confirm').value
  
  if (password !== confirm) {
    alert('Passwords do not match!')
    return
  }
  
  try {
    const result = await clerk.client.signUp.create({
      emailAddress: email,
      password: password
    })
    alert('Sign up successful!')
    console.log('Sign up result:', result)
  } catch (error) {
    alert('Sign up failed: ' + error.message)
  }
})

document.getElementById('toggle-mode').addEventListener('click', () => {
  const signInDiv = document.getElementById('sign-in-div')
  const signUpDiv = document.getElementById('sign-up-div')
  const button = document.getElementById('toggle-mode')
  
  if (signInDiv.style.display === 'none') {
    signInDiv.style.display = 'block'
    signUpDiv.style.display = 'none'
    button.textContent = 'Switch to Sign Up'
  } else {
    signInDiv.style.display = 'none'
    signUpDiv.style.display = 'block'
    button.textContent = 'Switch to Sign In'
  }
})