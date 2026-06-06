import './style.css'
import { Clerk } from '@clerk/clerk-js'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const clerk = new Clerk(clerkPubKey)

await clerk.load()

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Clerk Authentication</h1>

    <div id="sign-in"></div>
    <div id="sign-up"></div>
  </div>
`

clerk.mountSignIn(document.getElementById('sign-in'))

clerk.mountSignUp(document.getElementById('sign-up'))