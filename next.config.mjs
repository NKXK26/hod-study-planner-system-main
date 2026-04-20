/** @type {import('next').NextConfig} */
const nextConfig = {
	api: {
		bodyParser: {
			sizeLimit: '10mb', // Maximum 10MB for API request bodies to prevent memory exhaustion
		},
	},

	webpack: (config) => {
		config.resolve.fallback = {
			...config.resolve.fallback,
			canvas: false,
		};
		return config;
	},
};


/**	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'Content-Security-Policy',
						value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://login.microsoftonline.com https://*.msauth.net https://*.microsoft.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff'
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY'
					},
					{
						key: 'X-XSS-Protection',
						value: '1; mode=block'
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin'
					},
					{
						key: 'Permissions-Policy',
						value: 'geolocation=(), microphone=(), camera=(), payment=()'
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains'
					}
				]
			}
		]
	}**/
export default nextConfig;