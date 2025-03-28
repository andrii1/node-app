const auth =
  "Basic " +
  Buffer.from(`${WP_USERNAME}:${WP_APPLICATION_PASSWORD}`).toString("base64"); // Basic Auth token

const postData = {
  title: "Your Post Title",
  content: "This is the content of your post.",
  status: "publish",
};

// Define the async function to create a post
const createPost = async () => {
  try {
    const response = await fetch(WP_URL_POSTS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth, // Authentication header
      },
      body: JSON.stringify(postData),
    });

    // Check if the response is OK (status code 200-299)
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();
    console.log("Post created successfully:", data);
  } catch (error) {
    console.error("Error creating post:", error);
  }
};

// Call the createPost function
// createPost();


try {
    const response = await fetch(process.env.WP_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.WP_USERNAME}:${process.env.WP_APPLICATION_PASSWORD}`
        ).toString("base64")}`,
        // Add Content-Disposition header here
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });
