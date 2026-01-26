# Ninjo Prompt Analyzer - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Set up your environment

1. Make sure you have Node.js 18+ installed
2. Get your Anthropic API key from https://console.anthropic.com/

### Step 2: Install and configure

```bash
# Install dependencies
npm install --legacy-peer-deps

# Create your environment file
cp .env.local.example .env.local

# Edit .env.local and add your API key
# ANTHROPIC_API_KEY=your_actual_api_key_here
```

### Step 3: Run the app

```bash
# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

## 📝 How to Use

### Basic Analysis

1. **Paste your prompt** in the large text area
2. Click **"Analyze Prompt"**
3. Wait 15-30 seconds for Claude to analyze
4. Review the results on the right side

### Adding Feedback (Optional)

To get better analysis:

**Upload Screenshots:**
- Drag & drop images showing problematic outputs
- Or click "browse" to select files
- Max 5MB per image, up to 20 images

**Add Text Feedback:**
- Paste chat logs or user comments
- Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to add

### Working with Suggestions

Each suggestion card shows:
- **Priority level** (High/Medium/Low)
- **Issues found** in that section
- **Why it's problematic**
- **Suggested improvement**

**Actions:**
- **Accept** - Apply the suggestion immediately
- **Edit** - Modify the suggestion before applying
- **Reject** - Dismiss the suggestion
- **Expand** - See the diff view (original vs. suggested)

### Version Control

Every time you apply a suggestion:
- A new version is automatically saved
- You can restore any previous version
- All versions are stored in your browser

## 🎯 Best Practices

1. **Start Simple**: Try analyzing without feedback first
2. **Add Context**: Upload screenshots showing actual problems
3. **Iterate**: Apply suggestions one at a time and re-analyze
4. **Track Changes**: Use version history to compare iterations
5. **Be Specific**: Add text feedback explaining what went wrong

## 💡 Tips

- The diff viewer shows word-level changes for precision
- Severity is automatically assessed (High = will likely cause failures)
- Green badge = suggestion already applied
- Gray & faded = suggestion rejected
- Use Cmd/Ctrl+Enter to quickly add text feedback

## 🐛 Troubleshooting

### "ANTHROPIC_API_KEY is not configured"
- Make sure `.env.local` exists in the root directory
- Check that your API key is correct (starts with `sk-ant-`)
- Restart the dev server after adding the key

### "Failed to analyze prompt"
- Check your internet connection
- Verify your API key has credits remaining
- Try with a shorter prompt

### Images not uploading
- Max size is 5MB per image
- Only PNG, JPG, GIF, WebP supported
- Try compressing large images

### Build errors
- Run `npm install --legacy-peer-deps` again
- Delete `.next` folder and rebuild
- Check that Node.js version is 18+

## 📊 What Gets Analyzed

Claude checks for:
- ✅ Ambiguous instructions
- ✅ Contradictory statements
- ✅ Missing context
- ✅ Complex or confusing phrasing
- ✅ Missing examples
- ✅ Vague language
- ✅ Unaddressed edge cases
- ✅ Formatting issues
- ✅ Inconsistencies across sections

## 💰 Cost Estimate

Typical analysis costs:
- **Simple prompt** (< 1000 tokens): $0.02 - $0.05
- **Medium prompt** (1000-3000 tokens): $0.05 - $0.10
- **Complex prompt + images**: $0.10 - $0.20

Costs depend on:
- Prompt length
- Number of images
- Amount of feedback text

## 🔒 Privacy & Security

- All analysis happens via Anthropic's API
- Images are sent to Claude only during analysis
- Data is stored locally in your browser
- No data is saved on our servers
- API key never leaves your local environment

## 📚 Next Steps

Once you're comfortable:
1. Try analyzing multiple versions of the same prompt
2. Compare results with and without screenshots
3. Use version history to track improvements over time
4. Export improved prompts for use in Ninjo

## 🆘 Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review the [project structure](./README.md#project-structure)
- Open an issue on GitHub for bugs or feature requests

---

**Ready to improve your prompts? Start analyzing!** 🚀
