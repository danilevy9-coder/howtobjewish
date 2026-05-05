import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (AUDIENCE_ID) {
      // Add to Resend audience for newsletter
      await resend.contacts.create({
        email,
        audienceId: AUDIENCE_ID,
      })
    }

    // Send welcome email
    await resend.emails.send({
      from: 'How to Be Jewish <noreply@howtobjewish.org>',
      to: email,
      subject: 'Welcome to How to Be Jewish',
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a3a5c;">Welcome!</h1>
          <p>Thank you for subscribing to How to Be Jewish.</p>
          <p>You'll receive weekly guides and insights on Jewish life — practical, warm, and judgement-free.</p>
          <p>In the meantime, explore our latest articles at <a href="https://www.howtobjewish.org">howtobjewish.org</a>.</p>
          <p style="color: #666; margin-top: 2em; font-size: 0.9em;">— The How to Be Jewish Team</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter signup error:', error)
    // If contact already exists in audience, still return success
    if (String(error).includes('already exists')) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}
